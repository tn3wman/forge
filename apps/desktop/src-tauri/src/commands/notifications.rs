use crate::github::notifications;

#[tauri::command]
pub async fn github_list_notifications(
    client: tauri::State<'_, reqwest::Client>,
    token: String,
    all: bool,
) -> Result<Vec<notifications::NotificationItem>, String> {
    notifications::list_notifications(&client, &token, all).await
}

#[tauri::command]
pub async fn github_mark_notification_read(
    client: tauri::State<'_, reqwest::Client>,
    token: String,
    thread_id: String,
) -> Result<(), String> {
    notifications::mark_notification_read(&client, &token, &thread_id).await
}

#[tauri::command]
pub async fn github_mark_all_notifications_read(
    client: tauri::State<'_, reqwest::Client>,
    token: String,
) -> Result<(), String> {
    notifications::mark_all_read(&client, &token).await
}
