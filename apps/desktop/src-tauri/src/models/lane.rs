use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lane {
    pub id: String,
    pub bay_id: String,
    pub goal: String,
    pub status: String,
    pub agent_id: Option<String>,
    pub model_id: Option<String>,
    pub file_scope: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
