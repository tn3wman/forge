mod commands;
mod db;
mod lsp;
mod models;
mod watcher;

use db::Database;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Welcome to {name} — your agentic development environment")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let db_path = app_data_dir.join("forge.db");
            let database = Database::new(&db_path)
                .map_err(|e| format!("Failed to open database: {e}"))?;
            database
                .run_migrations()
                .map_err(|e| format!("Failed to run migrations: {e}"))?;
            app.manage(database);
            app.manage(commands::fs::WatcherState {
                watchers: std::sync::Mutex::new(std::collections::HashMap::new()),
            });
            app.manage(lsp::manager::LspManager::new());
            Ok(())
        })
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::create_bay,
            commands::list_bays,
            commands::get_bay,
            commands::delete_bay,
            commands::open_bay,
            commands::update_bay_window_state,
            commands::create_lane,
            commands::list_lanes,
            commands::list_all_lanes,
            commands::update_lane_status,
            commands::append_event,
            commands::query_events,
            commands::read_directory,
            commands::read_file,
            commands::write_file,
            commands::start_file_watcher,
            commands::stop_file_watcher,
            commands::lsp_start,
            commands::lsp_stop,
            commands::lsp_stop_all,
            commands::lsp_did_open,
            commands::lsp_did_change,
            commands::lsp_completion,
            commands::lsp_hover,
            commands::lsp_definition,
            commands::lsp_document_symbols,
            commands::lsp_workspace_symbols,
            commands::command_ledger_insert,
            commands::command_ledger_complete,
            commands::command_ledger_get,
            commands::command_ledger_query,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
