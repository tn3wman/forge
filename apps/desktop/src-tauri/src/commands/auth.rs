use crate::github::{client as gh_client, device_flow};
use crate::keychain::{self, TokenCache};
use crate::models::auth::{DeviceFlowResponse, GitHubUser, TokenInfo};

#[tauri::command]
pub async fn auth_start_device_flow(
    client: tauri::State<'_, reqwest::Client>,
) -> Result<DeviceFlowResponse, String> {
    device_flow::start_device_flow(&client).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn auth_poll_device_flow(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    deviceCode: String,
) -> Result<Option<TokenInfo>, String> {
    match device_flow::poll_for_token(&client, &deviceCode).await {
        device_flow::PollResult::Success(token_info) => {
            keychain::store_token(&token_info.access_token)?;
            cache.set(token_info.access_token.clone());
            Ok(Some(token_info))
        }
        device_flow::PollResult::Pending => {
            tracing::info!("Poll: authorization_pending");
            Ok(None)
        }
        device_flow::PollResult::SlowDown => {
            tracing::info!("Poll: slow_down");
            Ok(None)
        }
        device_flow::PollResult::Expired => Err("Device code expired. Please try again.".into()),
        device_flow::PollResult::Error(e) => Err(e),
    }
}

#[tauri::command]
pub fn auth_get_stored_token(
    cache: tauri::State<'_, TokenCache>,
) -> Result<Option<String>, String> {
    // Return cached token if available (avoids macOS Keychain prompt)
    if let Some(token) = cache.get() {
        return Ok(Some(token));
    }
    // First access: read from keychain and cache it
    let token = keychain::get_token()?;
    if let Some(ref t) = token {
        cache.set(t.clone());
    }
    Ok(token)
}

#[tauri::command]
pub fn auth_delete_stored_token(
    cache: tauri::State<'_, TokenCache>,
) -> Result<(), String> {
    cache.clear();
    keychain::delete_token()
}

#[tauri::command]
pub async fn auth_get_user(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
) -> Result<GitHubUser, String> {
    let token = cache.require_token()?;
    gh_client::get_authenticated_user(&client, &token).await
}
