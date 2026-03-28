use crate::github::notifications;
use crate::keychain::TokenCache;

#[tauri::command]
pub async fn github_list_notifications(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    all: bool,
) -> Result<Vec<notifications::NotificationItem>, String> {
    let token = cache.require_token()?;
    notifications::list_notifications(&client, &token, all).await
}

#[tauri::command]
pub async fn github_mark_notification_read(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    thread_id: String,
) -> Result<(), String> {
    let token = cache.require_token()?;
    notifications::mark_notification_read(&client, &token, &thread_id).await
}

#[tauri::command]
pub async fn github_mark_all_notifications_read(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    notifications::mark_all_read(&client, &token).await
}
