use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandEntry {
    pub id: String,
    pub bay_id: String,
    pub lane_id: Option<String>,
    pub agent_id: Option<String>,
    pub terminal_id: Option<String>,
    pub command: String,
    pub cwd: String,
    pub env: Option<String>,
    pub status: String,
    pub exit_code: Option<i32>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub stdout_preview: Option<String>,
    pub stderr_preview: Option<String>,
    pub metadata: Option<String>,
}
