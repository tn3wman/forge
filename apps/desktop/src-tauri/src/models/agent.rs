use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    Text { text: String },
    ToolUse { id: String, name: String, input: serde_json::Value },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentState {
    Idle,
    Thinking,
    Executing,
    AwaitingApproval,
    Completed,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEvent {
    SystemInit {
        session_id: String,
        model: Option<String>,
        permission_mode: Option<String>,
        tools: Option<Vec<String>>,
    },
    AssistantMessage {
        message_id: String,
        content: Vec<ContentBlock>,
    },
    AssistantMessageDelta {
        message_id: String,
        content_delta: String,
    },
    ToolUse {
        tool_use_id: String,
        name: String,
        input: serde_json::Value,
    },
    ToolResult {
        tool_use_id: String,
        content: String,
        is_error: bool,
    },
    Status {
        state: AgentState,
        tool: Option<String>,
        tool_use_id: Option<String>,
    },
    Result {
        result_text: String,
        duration_ms: u64,
        total_cost_usd: f64,
        is_error: bool,
    },
    Raw {
        data: serde_json::Value,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AgentMode {
    Default,
    Plan,
    AcceptEdits,
    BypassPermissions,
    DontAsk,
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAgentSessionRequest {
    pub cli_name: String,
    pub mode: AgentMode,
    pub working_directory: Option<String>,
    pub workspace_id: String,
    pub initial_prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSessionInfo {
    pub id: String,
    pub cli_name: String,
    pub display_name: String,
    pub mode: AgentMode,
    pub working_directory: Option<String>,
    pub workspace_id: String,
    pub conversation_id: Option<String>,
    pub is_alive: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentEventPayload {
    pub session_id: String,
    pub event: AgentEvent,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentExitPayload {
    pub session_id: String,
    pub exit_code: Option<i32>,
}
