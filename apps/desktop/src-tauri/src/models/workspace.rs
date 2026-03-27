use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    pub id: String,
    pub workspace_id: String,
    pub owner: String,
    pub name: String,
    pub full_name: String,
    pub local_path: Option<String>,
    pub github_id: Option<i64>,
    pub is_private: bool,
    pub default_branch: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub icon: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceRequest {
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddRepoRequest {
    pub workspace_id: String,
    pub owner: String,
    pub name: String,
    pub full_name: String,
    pub github_id: Option<i64>,
    pub is_private: bool,
    pub default_branch: String,
}

pub const WORKSPACE_COLORS: &[&str] = &[
    "blue", "green", "purple", "orange", "pink",
    "teal", "red", "yellow", "indigo", "emerald",
];

pub fn random_color() -> String {
    use std::time::SystemTime;
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .subsec_nanos() as usize;
    WORKSPACE_COLORS[nanos % WORKSPACE_COLORS.len()].to_string()
}
