use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub id: String,
    pub role: String,
    pub name: String,
    pub model_id: String,
    pub permissions: String,
    pub system_prompt: Option<String>,
    pub created_at: String,
}
