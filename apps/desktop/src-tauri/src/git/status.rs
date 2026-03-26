use git2::{Repository, StatusOptions, Status};

use crate::models::git::FileStatus;

fn status_entry(path: &str, status_str: &str, staged: bool) -> FileStatus {
    FileStatus {
        path: path.to_string(),
        status: status_str.to_string(),
        staged,
    }
}

pub fn get_status(path: &str) -> Result<Vec<FileStatus>, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get status: {e}"))?;

    let mut result = Vec::new();

    for entry in statuses.iter() {
        let file_path = entry.path().unwrap_or("").to_string();
        let s = entry.status();

        // Index (staged) statuses
        if s.contains(Status::INDEX_NEW) {
            result.push(status_entry(&file_path, "added", true));
        }
        if s.contains(Status::INDEX_MODIFIED) {
            result.push(status_entry(&file_path, "modified", true));
        }
        if s.contains(Status::INDEX_DELETED) {
            result.push(status_entry(&file_path, "deleted", true));
        }
        if s.contains(Status::INDEX_RENAMED) {
            result.push(status_entry(&file_path, "renamed", true));
        }

        // Workdir (unstaged) statuses
        if s.contains(Status::WT_NEW) {
            result.push(status_entry(&file_path, "untracked", false));
        }
        if s.contains(Status::WT_MODIFIED) {
            result.push(status_entry(&file_path, "modified", false));
        }
        if s.contains(Status::WT_DELETED) {
            result.push(status_entry(&file_path, "deleted", false));
        }
        if s.contains(Status::WT_RENAMED) {
            result.push(status_entry(&file_path, "renamed", false));
        }

        // Conflicted
        if s.contains(Status::CONFLICTED) {
            result.push(status_entry(&file_path, "conflicted", false));
        }
    }

    Ok(result)
}
