use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliInfo {
    pub name: String,
    pub display_name: String,
    pub path: String,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentMode {
    Normal,
    Plan,
    DangerouslyBypassPermissions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionRequest {
    pub cli_name: String,
    pub mode: AgentMode,
    pub working_directory: Option<String>,
    pub workspace_id: String,
    pub permission_mode: Option<String>,
    pub plan_mode: Option<bool>,
    pub model: Option<String>,
    pub effort: Option<String>,
    pub initial_cols: Option<u16>,
    pub initial_rows: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub id: String,
    pub cli_name: String,
    pub display_name: String,
    pub mode: AgentMode,
    pub working_directory: Option<String>,
    pub workspace_id: String,
    pub is_alive: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputPayload {
    pub session_id: String,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExitPayload {
    pub session_id: String,
    pub exit_code: Option<u32>,
}
