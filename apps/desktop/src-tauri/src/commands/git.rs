use crate::db::Database;
use crate::keychain::TokenCache;
use crate::models::git::{
    BranchInfo, DiffEntry, FileStatus, GeneratedCommitMessage, GraphRow, StashEntry, WorktreeInfo,
};

// ── Clone ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_clone_repo(
    db: tauri::State<'_, Database>,
    cache: tauri::State<'_, TokenCache>,
    url: String,
    local_path: String,
    repo_id: Option<String>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    let lp = local_path.clone();
    tokio::task::spawn_blocking(move || crate::git::clone::clone_repo(&url, &lp, &token))
        .await
        .map_err(|e| format!("Task failed: {e}"))??;

    // If repo_id provided, update local_path in DB
    if let Some(rid) = repo_id {
        let now = super::workspace::chrono_now_pub();
        let conn = db.conn.lock().unwrap();
        conn.execute(
            "UPDATE repositories SET local_path = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![local_path, now, rid],
        )
        .map_err(|e| format!("Failed to update local path: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn git_get_remote_url(
    path: String,
    remote: Option<String>,
) -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(move || {
        crate::git::clone::get_remote_url(&path, remote.as_deref())
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

// ── Status ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_get_status(path: String) -> Result<Vec<FileStatus>, String> {
    tokio::task::spawn_blocking(move || crate::git::status::get_status(&path))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

// ── Log ─────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_get_log(
    path: String,
    skip: usize,
    limit: usize,
    branch: Option<String>,
) -> Result<Vec<GraphRow>, String> {
    tokio::task::spawn_blocking(move || {
        crate::git::log::get_log(&path, skip, limit, branch.as_deref())
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

// ── Diff ────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_get_diff(
    path: String,
    staged: bool,
    file_path: Option<String>,
) -> Result<Vec<DiffEntry>, String> {
    tokio::task::spawn_blocking(move || {
        crate::git::diff::get_diff(&path, staged, file_path.as_deref())
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

// ── Branches ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_list_branches(path: String) -> Result<Vec<BranchInfo>, String> {
    tokio::task::spawn_blocking(move || crate::git::branch::list_branches(&path))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_create_branch(
    path: String,
    name: String,
    from_ref: Option<String>,
) -> Result<BranchInfo, String> {
    tokio::task::spawn_blocking(move || {
        crate::git::branch::create_branch(&path, &name, from_ref.as_deref())
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_checkout_branch(path: String, name: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::branch::checkout_branch(&path, &name))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_delete_branch(path: String, name: String, force: Option<bool>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::branch::delete_branch(&path, &name, force.unwrap_or(false)))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_delete_remote_branch(
    cache: tauri::State<'_, TokenCache>,
    path: String,
    remote: String,
    branch: String,
) -> Result<(), String> {
    let token = cache.require_token()?;
    tokio::task::spawn_blocking(move || {
        crate::git::branch::delete_remote_branch(&path, &remote, &branch, &token)
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_rename_branch(
    path: String,
    old_name: String,
    new_name: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        crate::git::branch::rename_branch(&path, &old_name, &new_name)
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_get_current_branch(path: String) -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(move || crate::git::branch::get_current_branch(&path))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

// ── Worktrees ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_list_worktrees(path: String) -> Result<Vec<WorktreeInfo>, String> {
    tokio::task::spawn_blocking(move || crate::git::worktree::list_worktrees(&path))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_create_worktree(
    path: String,
    branch: String,
    from_ref: Option<String>,
    worktree_base: Option<String>,
) -> Result<WorktreeInfo, String> {
    tokio::task::spawn_blocking(move || {
        crate::git::worktree::create_worktree(
            &path,
            &branch,
            from_ref.as_deref(),
            worktree_base.as_deref(),
        )
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_remove_worktree(path: String, name: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::worktree::remove_worktree(&path, &name))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_unlock_worktree(path: String, name: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::worktree::unlock_worktree(&path, &name))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

// ── Staging & Commit ────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_stage_files(path: String, paths: Vec<String>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::commit::stage_files(&path, &paths))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_unstage_files(path: String, paths: Vec<String>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::commit::unstage_files(&path, &paths))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_stage_all(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::commit::stage_all(&path))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_commit(path: String, message: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || crate::git::commit::create_commit(&path, &message))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_amend(path: String, message: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || crate::git::commit::amend_commit(&path, &message))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_generate_commit_message(
    path: String,
    claude_path: Option<String>,
    provider: Option<String>,
    model: Option<String>,
) -> Result<GeneratedCommitMessage, String> {
    let cli = claude_path.unwrap_or_default();
    let prov = provider.unwrap_or_default();
    let mdl = model.unwrap_or_default();
    tokio::task::spawn_blocking(move || {
        crate::git::commit_message::generate(&path, &cli, &prov, &mdl)
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

// ── Remote ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_fetch(
    cache: tauri::State<'_, TokenCache>,
    path: String,
    remote_name: String,
) -> Result<(), String> {
    let token = cache.require_token()?;
    tokio::task::spawn_blocking(move || crate::git::remote::fetch(&path, &remote_name, &token))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_pull(
    cache: tauri::State<'_, TokenCache>,
    path: String,
    remote_name: String,
    branch: Option<String>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    tokio::task::spawn_blocking(move || {
        let branch = match branch {
            Some(b) => b,
            None => crate::git::branch::get_current_branch(&path)?
                .ok_or_else(|| "No branch checked out".to_string())?,
        };
        crate::git::remote::pull(&path, &remote_name, &branch, &token)
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_push(
    cache: tauri::State<'_, TokenCache>,
    path: String,
    remote_name: String,
    branch: Option<String>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    tokio::task::spawn_blocking(move || {
        let branch = match branch {
            Some(b) => b,
            None => crate::git::branch::get_current_branch(&path)?
                .ok_or_else(|| "No branch checked out".to_string())?,
        };
        crate::git::remote::push(&path, &remote_name, &branch, &token)
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_sync_branch(
    cache: tauri::State<'_, TokenCache>,
    path: String,
    remote_name: String,
    branch: String,
) -> Result<(), String> {
    let token = cache.require_token()?;
    tokio::task::spawn_blocking(move || {
        crate::git::remote::sync_branch(&path, &remote_name, &branch, &token)
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

// ── Stash ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn git_stash_push(
    path: String,
    message: Option<String>,
    include_untracked: bool,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        crate::git::stash::stash_push(&path, message.as_deref(), include_untracked)
    })
    .await
    .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_stash_list(path: String) -> Result<Vec<StashEntry>, String> {
    tokio::task::spawn_blocking(move || crate::git::stash::stash_list(&path))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_stash_pop(path: String, index: usize) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::stash::stash_pop(&path, index))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_stash_apply(path: String, index: usize) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::stash::stash_apply(&path, index))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

#[tauri::command]
pub async fn git_stash_drop(path: String, index: usize) -> Result<(), String> {
    tokio::task::spawn_blocking(move || crate::git::stash::stash_drop(&path, index))
        .await
        .map_err(|e| format!("Task failed: {e}"))?
}

// ── File Watcher ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn git_start_watching(
    watcher: tauri::State<'_, crate::background::repo_watcher::RepoWatcher>,
    app_handle: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    watcher.watch(&path, app_handle)
}

#[tauri::command]
pub fn git_stop_watching(
    watcher: tauri::State<'_, crate::background::repo_watcher::RepoWatcher>,
    path: String,
) -> Result<(), String> {
    watcher.unwatch(&path)
}

// ── Local Path ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn git_set_local_path(
    db: tauri::State<'_, Database>,
    repo_id: String,
    local_path: String,
) -> Result<(), String> {
    // Validate .git/ exists at path
    let git_dir = std::path::Path::new(&local_path).join(".git");
    if !git_dir.exists() {
        return Err(format!(
            "No .git directory found at '{local_path}'. Not a valid Git repository."
        ));
    }

    let now = crate::commands::workspace::chrono_now_pub();
    let conn = db.conn.lock().unwrap();

    let changes = conn
        .execute(
            "UPDATE repositories SET local_path = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![local_path, now, repo_id],
        )
        .map_err(|e| format!("Failed to update local path: {e}"))?;

    if changes == 0 {
        return Err("Repository not found".to_string());
    }

    Ok(())
}
