use crate::models::terminal::{CliInfo, CreateSessionRequest, SessionInfo};
use crate::terminal::manager::SessionManager;
use tauri::AppHandle;

#[tauri::command]
pub async fn terminal_discover_clis() -> Result<Vec<CliInfo>, String> {
    tokio::task::spawn_blocking(crate::terminal::discovery::discover_clis)
        .await
        .map_err(|e| format!("Task failed: {e}"))
}

#[tauri::command]
pub async fn terminal_create_session(
    manager: tauri::State<'_, SessionManager>,
    request: CreateSessionRequest,
) -> Result<SessionInfo, String> {
    manager.create_session(request)
}

#[tauri::command]
pub async fn terminal_attach(
    manager: tauri::State<'_, SessionManager>,
    app_handle: AppHandle,
    session_id: String,
) -> Result<(), String> {
    manager.attach_session(&session_id, app_handle)
}

#[tauri::command]
pub async fn terminal_list_sessions(
    manager: tauri::State<'_, SessionManager>,
    workspace_id: Option<String>,
) -> Result<Vec<SessionInfo>, String> {
    Ok(manager.list_sessions(workspace_id.as_deref()))
}

#[tauri::command]
pub async fn terminal_write(
    manager: tauri::State<'_, SessionManager>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    manager.write_to_session(&session_id, &data)
}

#[tauri::command]
pub async fn terminal_resize(
    manager: tauri::State<'_, SessionManager>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    manager.resize_session(&session_id, cols, rows)
}

#[tauri::command]
pub async fn terminal_kill(
    manager: tauri::State<'_, SessionManager>,
    session_id: String,
) -> Result<(), String> {
    manager.kill_session(&session_id)
}
