use serde::{Deserialize, Serialize};

/// GitHub returns snake_case; we serialize to camelCase for the TS frontend.
/// Use separate Deserialize (snake_case) and Serialize (camelCase) structs
/// where needed, or use field-level renames.

#[derive(Debug, Deserialize)]
pub struct GitHubDeviceFlowRaw {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

impl From<GitHubDeviceFlowRaw> for DeviceFlowResponse {
    fn from(raw: GitHubDeviceFlowRaw) -> Self {
        Self {
            device_code: raw.device_code,
            user_code: raw.user_code,
            verification_uri: raw.verification_uri,
            expires_in: raw.expires_in,
            interval: raw.interval,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenInfo {
    pub access_token: String,
    pub token_type: String,
    pub scope: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubUser {
    pub id: u64,
    pub login: String,
    pub name: Option<String>,
    #[serde(alias = "avatar_url")]
    pub avatar_url: String,
    pub email: Option<String>,
}
