mod commands;
mod db;
mod models;

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
            Ok(())
        })
        .plugin(tauri_plugin_window_state::Builder::new().build())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
