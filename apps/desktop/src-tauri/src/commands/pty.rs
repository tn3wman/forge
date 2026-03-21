use crate::pty::instance::TerminalInfo;
use crate::pty::PtyManager;
use tauri::State;

#[tauri::command]
pub fn pty_spawn(bay_id: String, cwd: String, cols: u16, rows: u16, label: Option<String>, app: tauri::AppHandle, state: State<'_, PtyManager>) -> Result<TerminalInfo, String> {
    state.spawn_terminal(bay_id, cwd, cols, rows, label, app)
}

#[tauri::command]
pub async fn pty_write(terminal_id: String, data: String, state: State<'_, PtyManager>) -> Result<(), String> {
    let manager = state.inner().clone();
    tokio::task::spawn_blocking(move || manager.write_to_terminal(&terminal_id, &data)).await.map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn pty_resize(terminal_id: String, cols: u16, rows: u16, state: State<'_, PtyManager>) -> Result<(), String> {
    let manager = state.inner().clone();
    tokio::task::spawn_blocking(move || manager.resize_terminal(&terminal_id, cols, rows)).await.map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub fn pty_kill(terminal_id: String, state: State<'_, PtyManager>) -> Result<(), String> { state.kill_terminal(&terminal_id) }

#[tauri::command]
pub fn pty_kill_all(bay_id: String, state: State<'_, PtyManager>) -> Result<(), String> { state.kill_all_for_bay(&bay_id) }

#[tauri::command]
pub fn pty_rename(terminal_id: String, label: String, state: State<'_, PtyManager>) -> Result<(), String> { state.rename_terminal(&terminal_id, label) }

#[tauri::command]
pub fn pty_list(bay_id: String, state: State<'_, PtyManager>) -> Result<Vec<TerminalInfo>, String> { state.list_terminals_for_bay(&bay_id) }
