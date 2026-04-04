mod agent;
mod background;
mod commands;
mod db;
mod git;
mod github;
mod keychain;
mod models;
pub(crate) mod shell_env;
mod terminal;
mod util;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // On Linux, WebKitGTK may try GPU-accelerated rendering via DMA-BUF/GBM which
    // fails on systems where the GPU driver isn't accessible (e.g. NVIDIA DGX Spark).
    // Disabling the DMA-BUF renderer forces a software fallback so the app starts
    // regardless of GPU access permissions.
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir).ok();

            let db_path = app_data_dir.join("forge.db");
            let database =
                Database::new(&db_path).map_err(|e| format!("Failed to open database: {e}"))?;
            database
                .run_migrations()
                .map_err(|e| format!("Failed to run migrations: {e}"))?;
            app.manage(database);

            let http_client = reqwest::Client::builder()
                .user_agent("Forge/0.0.0")
                .build()
                .map_err(|e| format!("Failed to create HTTP client: {e}"))?;
            app.manage(http_client);

            app.manage(background::repo_watcher::RepoWatcher::new());
            app.manage(terminal::manager::SessionManager::new());
            app.manage(agent::manager::AgentSessionManager::new());
            app.manage(keychain::TokenCache::new());

            Ok(())
        })
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::auth::auth_start_device_flow,
            commands::auth::auth_poll_device_flow,
            commands::auth::auth_get_stored_token,
            commands::auth::auth_delete_stored_token,
            commands::auth::auth_get_user,
            commands::workspace::workspace_create,
            commands::workspace::workspace_list,
            commands::workspace::workspace_get,
            commands::workspace::workspace_update,
            commands::workspace::workspace_delete,
            commands::workspace::workspace_reorder,
            commands::repo::repo_add,
            commands::repo::repo_list,
            commands::repo::repo_remove,
            commands::github::github_search_repos,
            commands::github::github_list_user_repos,
            commands::github::github_list_prs,
            commands::github::github_list_issues,
            commands::github::github_get_dashboard,
            commands::github::github_get_pr_detail,
            commands::github::github_get_pr_commits,
            commands::github::github_get_pr_files,
            commands::github::github_get_issue_detail,
            commands::github::github_close_issue,
            commands::github::github_reopen_issue,
            commands::github::github_update_issue,
            commands::github::github_lock_issue,
            commands::github::github_unlock_issue,
            commands::github::github_set_issue_labels,
            commands::github::github_set_issue_assignees,
            commands::github::github_create_issue,
            commands::github::github_list_repo_labels,
            commands::github::github_list_repo_assignees,
            commands::github::github_submit_review,
            commands::github::github_add_comment,
            commands::github::github_edit_comment,
            commands::github::github_delete_comment,
            commands::github::github_merge_pr,
            commands::github::github_close_pr,
            commands::github::github_reopen_pr,
            commands::github::github_create_pr,
            commands::github::github_mark_pr_ready,
            commands::github::github_convert_pr_to_draft,
            commands::git::git_get_status,
            commands::git::git_get_log,
            commands::git::git_get_diff,
            commands::git::git_list_branches,
            commands::git::git_create_branch,
            commands::git::git_checkout_branch,
            commands::git::git_delete_branch,
            commands::git::git_delete_remote_branch,
            commands::git::git_rename_branch,
            commands::git::git_get_current_branch,
            commands::git::git_stage_files,
            commands::git::git_unstage_files,
            commands::git::git_stage_all,
            commands::git::git_commit,
            commands::git::git_amend,
            commands::git::git_generate_commit_message,
            commands::git::git_fetch,
            commands::git::git_pull,
            commands::git::git_push,
            commands::git::git_sync_branch,
            commands::git::git_stash_push,
            commands::git::git_stash_list,
            commands::git::git_stash_pop,
            commands::git::git_stash_apply,
            commands::git::git_stash_drop,
            commands::git::git_clone_repo,
            commands::git::git_get_remote_url,
            commands::git::git_list_worktrees,
            commands::git::git_create_worktree,
            commands::git::git_remove_worktree,
            commands::git::git_unlock_worktree,
            commands::git::git_start_watching,
            commands::git::git_stop_watching,
            commands::git::git_set_local_path,
            commands::notifications::github_list_notifications,
            commands::notifications::github_mark_notification_read,
            commands::notifications::github_mark_all_notifications_read,
            commands::search::github_search,
            commands::terminal::terminal_discover_clis,
            commands::terminal::terminal_create_session,
            commands::terminal::terminal_list_sessions,
            commands::terminal::terminal_write,
            commands::terminal::terminal_resize,
            commands::terminal::terminal_kill,
            commands::agent::agent_create_session,
            commands::agent::agent_send_message,
            commands::agent::agent_respond_permission,
            commands::agent::agent_abort,
            commands::agent::agent_kill,
            commands::agent::agent_list_sessions,
            commands::agent::agent_update_permission_mode,
            commands::agent::agent_discover_slash_commands,
            commands::agent::agent_load_persisted_sessions,
            commands::agent::agent_load_messages,
            commands::agent::agent_persist_session,
            commands::agent::agent_persist_messages,
            commands::agent::agent_update_persisted_session_meta,
            commands::agent::agent_delete_persisted_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
