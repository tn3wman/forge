use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bay {
    pub id: String,
    pub name: String,
    pub project_path: String,
    pub git_branch: Option<String>,
    pub status: String,
    pub window_state: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_accessed_at: String,
}
