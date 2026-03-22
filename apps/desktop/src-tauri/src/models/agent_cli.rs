use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CliType {
    ClaudeCode,
    Codex,
}

impl std::fmt::Display for CliType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CliType::ClaudeCode => write!(f, "claude_code"),
            CliType::Codex => write!(f, "codex"),
        }
    }
}

impl CliType {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "claude_code" => Ok(CliType::ClaudeCode),
            "codex" => Ok(CliType::Codex),
            _ => Err(format!("Unknown CLI type: {s}")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Running,
    Completed,
    Failed,
    Killed,
}

impl std::fmt::Display for AgentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentStatus::Running => write!(f, "running"),
            AgentStatus::Completed => write!(f, "completed"),
            AgentStatus::Failed => write!(f, "failed"),
            AgentStatus::Killed => write!(f, "killed"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCliConfig {
    pub id: String,
    pub cli_type: String,
    pub display_name: String,
    pub executable_path: String,
    pub default_model: Option<String>,
    pub default_allowed_tools: Option<String>,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleCliMapping {
    pub id: String,
    pub role: String,
    pub cli_config_id: String,
    pub model_override: Option<String>,
    pub system_prompt_override: Option<String>,
    pub allowed_tools_override: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSession {
    pub id: String,
    pub bay_id: String,
    pub lane_id: String,
    pub cli_type: String,
    pub cli_config_id: Option<String>,
    pub prompt: String,
    pub status: String,
    pub exit_code: Option<i32>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub model: Option<String>,
    pub token_usage: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInfo {
    pub id: String,
    pub bay_id: String,
    pub lane_id: String,
    pub cli_type: CliType,
    pub status: AgentStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedCli {
    pub cli_type: CliType,
    pub path: String,
    pub version: Option<String>,
}
