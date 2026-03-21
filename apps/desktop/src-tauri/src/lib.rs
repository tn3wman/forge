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
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
