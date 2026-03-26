mod commands;
mod db;
mod github;
mod keychain;
mod models;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
            commands::github::github_submit_review,
            commands::github::github_add_comment,
            commands::github::github_edit_comment,
            commands::github::github_delete_comment,
            commands::github::github_merge_pr,
            commands::github::github_close_pr,
            commands::github::github_reopen_pr,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
