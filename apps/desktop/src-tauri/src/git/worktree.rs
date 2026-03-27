use std::path::Path;

use git2::Repository;

use crate::models::git::WorktreeInfo;

/// Directories to symlink from the main repo into new worktrees (best-effort).
const SYMLINK_DIRS: &[&str] = &["node_modules", ".next", "dist", "target", ".turbo"];

pub fn list_worktrees(path: &str) -> Result<Vec<WorktreeInfo>, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let names = repo
        .worktrees()
        .map_err(|e| format!("Failed to list worktrees: {e}"))?;

    let mut result = Vec::new();

    // Add the main working tree first
    let main_path = repo
        .workdir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let main_branch = repo
        .head()
        .ok()
        .and_then(|h| {
            if h.is_branch() {
                h.shorthand().map(|s| s.to_string())
            } else {
                None
            }
        });

    result.push(WorktreeInfo {
        name: "(main)".to_string(),
        path: main_path,
        branch: main_branch,
        is_locked: false,
        is_main: true,
    });

    // Add linked worktrees
    for i in 0..names.len() {
        let name = match names.get(i) {
            Some(n) => n.to_string(),
            None => continue,
        };

        let wt = match repo.find_worktree(&name) {
            Ok(wt) => wt,
            Err(_) => continue,
        };

        let is_locked = wt.is_locked().is_ok();

        let wt_path = wt.path().to_string_lossy().to_string();

        // Try to determine the branch by opening the worktree as a repo
        let branch = Repository::open(wt.path())
            .ok()
            .and_then(|wt_repo| {
                wt_repo.head().ok().and_then(|h| {
                    if h.is_branch() {
                        h.shorthand().map(|s| s.to_string())
                    } else {
                        None
                    }
                })
            });

        result.push(WorktreeInfo {
            name,
            path: wt_path,
            branch,
            is_locked,
            is_main: false,
        });
    }

    Ok(result)
}

pub fn create_worktree(
    path: &str,
    branch: &str,
    from_ref: Option<&str>,
    worktree_base: Option<&str>,
) -> Result<WorktreeInfo, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;
    let repo_root = repo
        .workdir()
        .ok_or_else(|| "Bare repository not supported".to_string())?;

    // Determine worktree directory
    let repo_name = repo_root
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("repo");

    let base = match worktree_base {
        Some(b) => std::path::PathBuf::from(b),
        None => repo_root
            .parent()
            .unwrap_or(repo_root)
            .join(format!("{repo_name}-worktrees")),
    };

    // Sanitize branch name for directory usage
    let dir_name = branch.replace('/', "-");
    let wt_path = base.join(&dir_name);

    if wt_path.exists() {
        return Err(format!(
            "Worktree directory already exists: {}",
            wt_path.display()
        ));
    }

    // Ensure base directory exists
    std::fs::create_dir_all(&base)
        .map_err(|e| format!("Failed to create worktree base directory: {e}"))?;

    // Check if branch exists locally; if not, create it
    let branch_exists = repo.find_branch(branch, git2::BranchType::Local).is_ok();

    if !branch_exists {
        // Create the branch from from_ref (or HEAD)
        let target_commit = if let Some(ref_name) = from_ref {
            let reference = repo
                .resolve_reference_from_short_name(ref_name)
                .map_err(|e| format!("Failed to resolve ref '{ref_name}': {e}"))?;
            reference
                .peel_to_commit()
                .map_err(|e| format!("Failed to peel to commit: {e}"))?
        } else {
            repo.head()
                .map_err(|e| format!("Failed to get HEAD: {e}"))?
                .peel_to_commit()
                .map_err(|e| format!("Failed to peel HEAD to commit: {e}"))?
        };

        repo.branch(branch, &target_commit, false)
            .map_err(|e| format!("Failed to create branch '{branch}': {e}"))?;
    }

    // Create the worktree
    let local_branch = repo
        .find_branch(branch, git2::BranchType::Local)
        .map_err(|e| format!("Failed to find branch '{branch}': {e}"))?;

    let branch_ref = local_branch
        .get()
        .name()
        .ok_or_else(|| "Branch ref has no name".to_string())?
        .to_string();

    let reference = repo
        .find_reference(&branch_ref)
        .map_err(|e| format!("Failed to find reference: {e}"))?;

    let mut opts = git2::WorktreeAddOptions::new();
    opts.reference(Some(&reference));

    repo.worktree(&dir_name, &wt_path, Some(&opts))
        .map_err(|e| format!("Failed to create worktree: {e}"))?;

    // Best-effort symlink of common directories
    setup_symlinks(repo_root, &wt_path);

    Ok(WorktreeInfo {
        name: dir_name,
        path: wt_path.to_string_lossy().to_string(),
        branch: Some(branch.to_string()),
        is_locked: false,
        is_main: false,
    })
}

pub fn remove_worktree(path: &str, name: &str) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let wt = repo
        .find_worktree(name)
        .map_err(|e| format!("Failed to find worktree '{name}': {e}"))?;

    let wt_path = wt.path().to_path_buf();

    // If locked, unlock first
    if wt.is_locked().is_ok() {
        wt.unlock().map_err(|e| format!("Failed to unlock worktree '{name}': {e}"))?;
    }

    // Prune the worktree reference
    wt.prune(Some(
        git2::WorktreePruneOptions::new()
            .working_tree(true)
            .valid(true),
    ))
    .map_err(|e| format!("Failed to prune worktree '{name}': {e}"))?;

    // Remove the worktree directory if it still exists
    if wt_path.exists() {
        std::fs::remove_dir_all(&wt_path)
            .map_err(|e| format!("Failed to remove worktree directory: {e}"))?;
    }

    Ok(())
}

/// Best-effort: symlink common build artifact / dependency directories.
fn setup_symlinks(repo_root: &Path, wt_path: &Path) {
    for dir_name in SYMLINK_DIRS {
        let source = repo_root.join(dir_name);
        let target = wt_path.join(dir_name);
        if source.is_dir() && !target.exists() {
            #[cfg(unix)]
            {
                let _ = std::os::unix::fs::symlink(&source, &target);
            }
            #[cfg(windows)]
            {
                let _ = std::os::windows::fs::symlink_dir(&source, &target);
            }
        }
    }
}
