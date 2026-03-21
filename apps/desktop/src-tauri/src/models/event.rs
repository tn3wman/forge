use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForgeEvent {
    pub id: String,
    pub bay_id: String,
    pub lane_id: Option<String>,
    pub task_id: Option<String>,
    pub agent_id: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub payload: String,
    pub timestamp: String,
}
