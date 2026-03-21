use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub lane_id: String,
    pub bay_id: String,
    #[serde(rename = "type")]
    pub task_type: String,
    pub description: String,
    pub status: String,
    pub input: Option<String>,
    pub output: Option<String>,
    pub parent_task_id: Option<String>,
    pub depends_on: Option<String>,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}
