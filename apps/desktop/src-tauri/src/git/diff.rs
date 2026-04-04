use std::collections::HashSet;

use git2::{Delta, Diff, DiffFormat, DiffOptions, Repository};

use crate::models::git::{DiffEntry, DiffHunk, DiffLine};

const MAX_LINES_PER_FILE: usize = 10_000;

fn delta_to_status(delta: Delta) -> &'static str {
    match delta {
        Delta::Added => "added",
        Delta::Deleted => "deleted",
        Delta::Modified => "modified",
        Delta::Renamed => "renamed",
        Delta::Copied => "copied",
        Delta::Untracked => "untracked",
        _ => "modified",
    }
}

fn diff_to_entries(diff: &Diff) -> Result<Vec<DiffEntry>, String> {
    let mut entries: Vec<DiffEntry> = Vec::new();

    diff.print(DiffFormat::Patch, |delta, hunk, line| {
        let file_path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip binary files
        if delta.new_file().is_binary() || delta.old_file().is_binary() {
            return true;
        }

        // Ensure we have an entry for this file
        let needs_new_entry = entries.last().map(|e| e.path != file_path).unwrap_or(true);
        if needs_new_entry {
            entries.push(DiffEntry {
                path: file_path,
                status: delta_to_status(delta.status()).to_string(),
                hunks: Vec::new(),
                additions: 0,
                deletions: 0,
            });
        }

        let entry = match entries.last_mut() {
            Some(e) => e,
            None => return true,
        };

        // Check line cap
        let total_lines: usize = entry.hunks.iter().map(|h| h.lines.len()).sum();
        if total_lines >= MAX_LINES_PER_FILE {
            return true;
        }

        // Handle hunk headers
        if let Some(hunk_info) = hunk {
            let header = std::str::from_utf8(hunk_info.header())
                .unwrap_or("")
                .trim_end()
                .to_string();

            // Check if we need a new hunk (hunk header line)
            let needs_new_hunk = entry
                .hunks
                .last()
                .map(|h| h.old_start != hunk_info.old_start() || h.new_start != hunk_info.new_start())
                .unwrap_or(true);

            if needs_new_hunk {
                entry.hunks.push(DiffHunk {
                    header,
                    old_start: hunk_info.old_start(),
                    new_start: hunk_info.new_start(),
                    lines: Vec::new(),
                });
            }
        }

        // Handle diff lines
        let origin_char = line.origin();
        match origin_char {
            '+' | '-' | ' ' => {
                let origin = match origin_char {
                    '+' => "+",
                    '-' => "-",
                    _ => " ",
                };

                if origin == "+" {
                    entry.additions += 1;
                } else if origin == "-" {
                    entry.deletions += 1;
                }

                let content = std::str::from_utf8(line.content())
                    .unwrap_or("")
                    .to_string();

                if let Some(hunk) = entry.hunks.last_mut() {
                    hunk.lines.push(DiffLine {
                        content,
                        origin: origin.to_string(),
                        old_line_no: line.old_lineno(),
                        new_line_no: line.new_lineno(),
                    });
                }
            }
            _ => {} // Skip file header lines, etc.
        }

        true
    })
    .map_err(|e| format!("Failed to iterate diff: {e}"))?;

    Ok(entries)
}

pub fn get_diff(
    path: &str,
    staged: bool,
    file_path: Option<&str>,
) -> Result<Vec<DiffEntry>, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut opts = DiffOptions::new();
    if let Some(fp) = file_path {
        opts.pathspec(fp);
    }

    let diff = if staged {
        let head_tree = repo
            .head()
            .and_then(|r| r.peel_to_tree())
            .ok();
        let mut index = repo
            .index()
            .map_err(|e| format!("Failed to read index: {e}"))?;
        index
            .read(true)
            .map_err(|e| format!("Failed to refresh index: {e}"))?;
        repo.diff_tree_to_index(head_tree.as_ref(), Some(&index), Some(&mut opts))
            .map_err(|e| format!("Failed to get staged diff: {e}"))?
    } else {
        repo.diff_index_to_workdir(None, Some(&mut opts))
            .map_err(|e| format!("Failed to get unstaged diff: {e}"))?
    };

    diff_to_entries(&diff)
}

/// Collect all changes (staged + unstaged + untracked) into a single diff list.
/// Files that appear in the staged diff take priority over their workdir counterpart.
pub fn get_all_diff(path: &str) -> Result<Vec<DiffEntry>, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    // 1. Staged diff (HEAD → index)
    let head_tree = repo.head().and_then(|r| r.peel_to_tree()).ok();
    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to read index: {e}"))?;
    index
        .read(true)
        .map_err(|e| format!("Failed to refresh index: {e}"))?;
    let staged_diff = repo
        .diff_tree_to_index(head_tree.as_ref(), Some(&index), None)
        .map_err(|e| format!("Failed to get staged diff: {e}"))?;
    let staged_entries = diff_to_entries(&staged_diff)?;

    // 2. Unstaged + untracked diff (index → workdir)
    let mut wd_opts = DiffOptions::new();
    wd_opts
        .include_untracked(true)
        .recurse_untracked_dirs(true);
    let wd_diff = repo
        .diff_index_to_workdir(None, Some(&mut wd_opts))
        .map_err(|e| format!("Failed to get workdir diff: {e}"))?;
    let wd_entries = diff_to_entries(&wd_diff)?;

    // 3. Merge: staged first, then workdir entries not already covered
    let staged_paths: HashSet<String> = staged_entries.iter().map(|e| e.path.clone()).collect();
    let mut combined = staged_entries;
    for entry in wd_entries {
        if !staged_paths.contains(&entry.path) {
            combined.push(entry);
        }
    }

    Ok(combined)
}
