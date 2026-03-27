use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageAttachment {
    pub data: String,
    pub media_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SlashCommandInfo {
    pub name: String,
    pub description: String,
    pub category: String,
    pub source: Option<String>,
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
#[serde(rename_all = "camelCase")]
pub struct ClaudeLaunchOptions {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub effort: Option<String>,
    pub agent: Option<String>,
    pub claude_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEvent {
    #[serde(rename_all = "camelCase")]
    SystemInit {
        session_id: String,
        model: Option<String>,
        permission_mode: Option<String>,
        tools: Option<Vec<String>>,
    },
    #[serde(rename_all = "camelCase")]
    SessionMeta {
        provider: Option<String>,
        conversation_id: Option<String>,
        agent: Option<String>,
        effort: Option<String>,
        claude_path: Option<String>,
        slash_commands: Option<Vec<SlashCommandInfo>>,
    },
    #[serde(rename_all = "camelCase")]
    AssistantMessageStart {
        message_id: String,
        turn_id: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    AssistantMessageDelta {
        message_id: String,
        content_delta: String,
    },
    #[serde(rename_all = "camelCase")]
    AssistantMessageComplete {
        message_id: String,
        turn_id: Option<String>,
        content: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    ThinkingStart {
        message_id: String,
        turn_id: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    ReasoningDelta {
        content_delta: String,
        message_id: Option<String>,
        turn_id: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    ReasoningComplete {
        message_id: Option<String>,
        turn_id: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    ToolUseStart {
        tool_use_id: String,
        name: String,
        input: serde_json::Value,
        turn_id: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    ToolInputDelta {
        tool_use_id: String,
        input_delta: String,
    },
    #[serde(rename_all = "camelCase")]
    ToolProgress {
        tool_use_id: Option<String>,
        name: Option<String>,
        status: String,
    },
    #[serde(rename_all = "camelCase")]
    ToolResultDelta {
        tool_use_id: String,
        content_delta: String,
        is_error: Option<bool>,
    },
    #[serde(rename_all = "camelCase")]
    ToolResultComplete {
        tool_use_id: String,
        content: Option<String>,
        is_error: bool,
    },
    #[serde(rename_all = "camelCase")]
    ApprovalRequested {
        approval_id: String,
        tool_use_id: Option<String>,
        tool_name: String,
        input: Option<serde_json::Value>,
        detail: String,
    },
    #[serde(rename_all = "camelCase")]
    ApprovalResolved {
        approval_id: String,
        allow: bool,
    },
    #[serde(rename_all = "camelCase")]
    Status {
        state: AgentState,
        tool: Option<String>,
        tool_use_id: Option<String>,
        message_id: Option<String>,
        turn_id: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
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
    Supervised,
    Assisted,
    FullAccess,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAgentSessionRequest {
    pub cli_name: String,
    pub mode: AgentMode,
    pub working_directory: Option<String>,
    pub workspace_id: String,
    pub initial_prompt: String,
    pub claude: Option<ClaudeLaunchOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSessionInfo {
    pub id: String,
    pub cli_name: String,
    pub provider: Option<String>,
    pub display_name: String,
    pub mode: AgentMode,
    pub working_directory: Option<String>,
    pub workspace_id: String,
    pub conversation_id: Option<String>,
    pub is_alive: bool,
    pub created_at: String,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub agent: Option<String>,
    pub effort: Option<String>,
    pub claude_path: Option<String>,
    pub capabilities_loaded: Option<bool>,
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
