use crate::github::{client as gh_client, device_flow};
use crate::keychain;
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
    deviceCode: String,
) -> Result<Option<TokenInfo>, String> {
    match device_flow::poll_for_token(&client, &deviceCode).await {
        device_flow::PollResult::Success(token_info) => {
            keychain::store_token(&token_info.access_token)?;
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
pub fn auth_get_stored_token() -> Result<Option<String>, String> {
    keychain::get_token()
}

#[tauri::command]
pub fn auth_delete_stored_token() -> Result<(), String> {
    keychain::delete_token()
}

#[tauri::command]
pub async fn auth_get_user(
    client: tauri::State<'_, reqwest::Client>,
    token: String,
) -> Result<GitHubUser, String> {
    gh_client::get_authenticated_user(&client, &token).await
}
