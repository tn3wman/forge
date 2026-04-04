use crate::agent::manager::AgentSessionManager;
use crate::agent::persistence::{self, PersistedMessage, PersistedSession};
use crate::agent::slash_commands;
use crate::db::Database;
use crate::models::agent::{AgentMode, AgentSessionInfo, CreateAgentSessionRequest, ImageAttachment, SlashCommandInfo};
use tauri::AppHandle;

#[tauri::command]
pub async fn agent_create_session(
    manager: tauri::State<'_, AgentSessionManager>,
    app_handle: AppHandle,
    request: CreateAgentSessionRequest,
) -> Result<AgentSessionInfo, String> {
    manager.create_session(request, app_handle)
}

#[tauri::command]
pub async fn agent_send_message(
    manager: tauri::State<'_, AgentSessionManager>,
    session_id: String,
    message: String,
    images: Option<Vec<ImageAttachment>>,
) -> Result<(), String> {
    manager.send_message(&session_id, &message, images.as_deref())
}

#[tauri::command]
pub async fn agent_respond_permission(
    manager: tauri::State<'_, AgentSessionManager>,
    session_id: String,
    tool_use_id: String,
    allow: bool,
    result_text: Option<String>,
) -> Result<(), String> {
    manager.respond_permission(&session_id, &tool_use_id, allow, result_text.as_deref())
}

#[tauri::command]
pub async fn agent_abort(
    manager: tauri::State<'_, AgentSessionManager>,
    session_id: String,
) -> Result<(), String> {
    manager.abort_session(&session_id)
}

#[tauri::command]
pub async fn agent_kill(
    manager: tauri::State<'_, AgentSessionManager>,
    session_id: String,
) -> Result<(), String> {
    manager.kill_session(&session_id)
}

#[tauri::command]
pub async fn agent_list_sessions(
    manager: tauri::State<'_, AgentSessionManager>,
    workspace_id: Option<String>,
) -> Result<Vec<AgentSessionInfo>, String> {
    Ok(manager.list_sessions(workspace_id.as_deref()))
}

#[tauri::command]
pub async fn agent_update_permission_mode(
    manager: tauri::State<'_, AgentSessionManager>,
    session_id: String,
    mode: AgentMode,
) -> Result<(), String> {
    manager.update_permission_mode(&session_id, mode)
}

#[tauri::command]
pub async fn agent_discover_slash_commands(cli_name: String) -> Result<Vec<SlashCommandInfo>, String> {
    Ok(slash_commands::discover_slash_commands(&cli_name))
}

#[tauri::command]
pub async fn agent_load_persisted_sessions(
    db: tauri::State<'_, Database>,
    workspace_id: String,
) -> Result<Vec<PersistedSession>, String> {
    let conn = db.conn.lock().unwrap();
    persistence::load_sessions(&conn, &workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn agent_load_messages(
    db: tauri::State<'_, Database>,
    session_id: String,
    offset: i64,
    limit: i64,
) -> Result<Vec<PersistedMessage>, String> {
    let conn = db.conn.lock().unwrap();
    persistence::load_messages(&conn, &session_id, offset, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn agent_persist_session(
    db: tauri::State<'_, Database>,
    session: PersistedSession,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    persistence::save_session(&conn, &session).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn agent_persist_messages(
    db: tauri::State<'_, Database>,
    messages: Vec<PersistedMessage>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    persistence::save_messages_batch(&conn, &messages).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn agent_update_persisted_session_meta(
    db: tauri::State<'_, Database>,
    session_id: String,
    conversation_id: Option<String>,
    total_cost: Option<f64>,
    model: Option<String>,
    provider: Option<String>,
    permission_mode: Option<String>,
    agent: Option<String>,
    effort: Option<String>,
    label: Option<String>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    persistence::update_session_meta(
        &conn,
        &session_id,
        conversation_id.as_deref(),
        total_cost,
        model.as_deref(),
        provider.as_deref(),
        permission_mode.as_deref(),
        agent.as_deref(),
        effort.as_deref(),
        label.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn agent_delete_persisted_session(
    db: tauri::State<'_, Database>,
    session_id: String,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    persistence::delete_session(&conn, &session_id).map_err(|e| e.to_string())
}
