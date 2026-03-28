use crate::models::auth::{DeviceFlowResponse, GitHubDeviceFlowRaw, TokenInfo};
use reqwest::Client;
use serde::Deserialize;

const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";

const DEFAULT_CLIENT_ID: &str = "Ov23liRHFmkBQxPly4BK";

pub fn client_id() -> String {
    std::env::var("FORGE_GITHUB_CLIENT_ID").unwrap_or_else(|_| DEFAULT_CLIENT_ID.to_string())
}

pub async fn start_device_flow(client: &Client) -> Result<DeviceFlowResponse, String> {
    let resp = client
        .post(DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", client_id().as_str()),
            ("scope", "repo read:user read:org notifications"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to start device flow: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Device flow error: {body}"));
    }

    let raw = resp
        .json::<GitHubDeviceFlowRaw>()
        .await
        .map_err(|e| format!("Failed to parse device flow response: {e}"))?;
    Ok(DeviceFlowResponse::from(raw))
}

#[derive(Debug, Deserialize)]
struct AccessTokenResponse {
    access_token: Option<String>,
    token_type: Option<String>,
    scope: Option<String>,
    error: Option<String>,
}

#[derive(Debug)]
pub enum PollResult {
    Success(TokenInfo),
    Pending,
    SlowDown,
    Expired,
    Error(String),
}

pub async fn poll_for_token(client: &Client, device_code: &str) -> PollResult {
    let cid = client_id();
    let resp = match client
        .post(ACCESS_TOKEN_URL)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", cid.as_str()),
            ("device_code", device_code),
            (
                "grant_type",
                "urn:ietf:params:oauth:grant-type:device_code",
            ),
        ])
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return PollResult::Error(format!("Request failed: {e}")),
    };

    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => return PollResult::Error(format!("Failed to read response: {e}")),
    };
    tracing::debug!("poll_for_token: received response ({} bytes)", text.len());
    let body: AccessTokenResponse = match serde_json::from_str(&text) {
        Ok(b) => b,
        Err(e) => return PollResult::Error(format!("Failed to parse token response: {e}")),
    };

    if let Some(token) = body.access_token {
        PollResult::Success(TokenInfo {
            access_token: token,
            token_type: body.token_type.unwrap_or_else(|| "bearer".to_string()),
            scope: body.scope.unwrap_or_default(),
        })
    } else {
        match body.error.as_deref() {
            Some("authorization_pending") => PollResult::Pending,
            Some("slow_down") => PollResult::SlowDown,
            Some("expired_token") => PollResult::Expired,
            Some(e) => PollResult::Error(format!("OAuth error: {e}")),
            None => PollResult::Error("Unknown response".to_string()),
        }
    }
}
