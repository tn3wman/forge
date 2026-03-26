use reqwest::Client;
use serde::{Deserialize, Serialize};

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Deserialize)]
struct NotificationRaw {
    id: String,
    unread: bool,
    reason: String,
    subject: SubjectRaw,
    repository: RepoRaw,
    updated_at: String,
    url: String,
}

#[derive(Debug, Deserialize)]
struct SubjectRaw {
    title: String,
    url: Option<String>,
    #[serde(rename = "type")]
    subject_type: String,
}

#[derive(Debug, Deserialize)]
struct RepoRaw {
    full_name: String,
    name: String,
    owner: OwnerRaw,
}

#[derive(Debug, Deserialize)]
struct OwnerRaw {
    login: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationItem {
    pub id: String,
    pub unread: bool,
    pub reason: String,
    pub subject_title: String,
    pub subject_url: Option<String>,
    pub subject_type: String,
    pub repo_full_name: String,
    pub repo_owner: String,
    pub repo_name: String,
    pub updated_at: String,
    pub url: String,
}

pub async fn list_notifications(
    client: &Client,
    token: &str,
    all: bool,
) -> Result<Vec<NotificationItem>, String> {
    let resp = client
        .get(format!("{GITHUB_API_BASE}/notifications"))
        .query(&[
            ("all", if all { "true" } else { "false" }),
            ("per_page", "50"),
        ])
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch notifications: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }

    let raw: Vec<NotificationRaw> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse notifications: {e}"))?;

    Ok(raw
        .into_iter()
        .map(|n| NotificationItem {
            id: n.id,
            unread: n.unread,
            reason: n.reason,
            subject_title: n.subject.title,
            subject_url: n.subject.url,
            subject_type: n.subject.subject_type,
            repo_full_name: n.repository.full_name,
            repo_owner: n.repository.owner.login,
            repo_name: n.repository.name,
            updated_at: n.updated_at,
            url: n.url,
        })
        .collect())
}

pub async fn mark_notification_read(
    client: &Client,
    token: &str,
    thread_id: &str,
) -> Result<(), String> {
    let resp = client
        .patch(format!(
            "{GITHUB_API_BASE}/notifications/threads/{thread_id}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to mark notification read: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }
    Ok(())
}

pub async fn mark_all_read(client: &Client, token: &str) -> Result<(), String> {
    let resp = client
        .put(format!("{GITHUB_API_BASE}/notifications"))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "read": true }))
        .send()
        .await
        .map_err(|e| format!("Failed to mark all notifications read: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }
    Ok(())
}
