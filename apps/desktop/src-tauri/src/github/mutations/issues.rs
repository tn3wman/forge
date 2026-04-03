use reqwest::Client;
use serde::{Deserialize, Serialize};

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueResult {
    pub number: i32,
    pub html_url: String,
}

#[derive(Debug, Deserialize)]
struct IssueResponse {
    number: i32,
    html_url: String,
}

pub async fn create_issue(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    title: &str,
    body: &str,
    labels: &[String],
) -> Result<CreateIssueResult, String> {
    let mut payload = serde_json::json!({
        "title": title,
        "body": body,
    });

    if !labels.is_empty() {
        payload["labels"] = serde_json::json!(labels);
    }

    let resp = client
        .post(format!("{GITHUB_API_BASE}/repos/{owner}/{repo}/issues"))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to create issue: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let parsed: IssueResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse issue response: {e}"))?;

    Ok(CreateIssueResult {
        number: parsed.number,
        html_url: parsed.html_url,
    })
}
