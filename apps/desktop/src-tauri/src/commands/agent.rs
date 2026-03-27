use crate::agent::manager::AgentSessionManager;
use crate::agent::slash_commands;
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
) -> Result<(), String> {
    manager.respond_permission(&session_id, &tool_use_id, allow)
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
