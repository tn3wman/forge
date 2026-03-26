use reqwest::Client;
use serde::{Deserialize, Serialize};

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommentResult {
    pub id: i64,
    pub body: String,
}

#[derive(Debug, Deserialize)]
struct CommentResponse {
    id: i64,
    body: String,
}

pub async fn add_comment(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    issue_number: i32,
    body: &str,
) -> Result<CommentResult, String> {
    let resp = client
        .post(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}/comments"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "body": body }))
        .send()
        .await
        .map_err(|e| format!("Failed to add comment: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let parsed: CommentResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse comment response: {e}"))?;

    Ok(CommentResult {
        id: parsed.id,
        body: parsed.body,
    })
}

pub async fn edit_comment(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    comment_id: i64,
    body: &str,
) -> Result<(), String> {
    let resp = client
        .patch(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/comments/{comment_id}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "body": body }))
        .send()
        .await
        .map_err(|e| format!("Failed to edit comment: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn delete_comment(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    comment_id: i64,
) -> Result<(), String> {
    let resp = client
        .delete(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/comments/{comment_id}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to delete comment: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}
