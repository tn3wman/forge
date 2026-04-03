use reqwest::Client;

use crate::github::graphql::execute_graphql;

const GITHUB_API_BASE: &str = "https://api.github.com";

pub async fn merge_pr(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    pr_number: i32,
    method: &str,
    title: Option<&str>,
    message: Option<&str>,
) -> Result<(), String> {
    let mut body = serde_json::json!({ "merge_method": method });
    if let Some(t) = title {
        body["commit_title"] = serde_json::json!(t);
    }
    if let Some(m) = message {
        body["commit_message"] = serde_json::json!(m);
    }

    let resp = client
        .put(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/merge"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to merge PR: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn close_pr(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    pr_number: i32,
) -> Result<(), String> {
    let resp = client
        .patch(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "state": "closed" }))
        .send()
        .await
        .map_err(|e| format!("Failed to close PR: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn reopen_pr(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    pr_number: i32,
) -> Result<(), String> {
    let resp = client
        .patch(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "state": "open" }))
        .send()
        .await
        .map_err(|e| format!("Failed to reopen PR: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn mark_ready_for_review(
    client: &Client,
    token: &str,
    pr_node_id: &str,
) -> Result<(), String> {
    let query = r#"
        mutation($pullRequestId: ID!) {
            markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
                pullRequest { isDraft }
            }
        }
    "#;
    let variables = serde_json::json!({ "pullRequestId": pr_node_id });
    execute_graphql(client, token, query, variables).await?;
    Ok(())
}

pub async fn convert_to_draft(
    client: &Client,
    token: &str,
    pr_node_id: &str,
) -> Result<(), String> {
    let query = r#"
        mutation($pullRequestId: ID!) {
            convertPullRequestToDraft(input: { pullRequestId: $pullRequestId }) {
                pullRequest { isDraft }
            }
        }
    "#;
    let variables = serde_json::json!({ "pullRequestId": pr_node_id });
    execute_graphql(client, token, query, variables).await?;
    Ok(())
}

#[derive(Debug, serde::Serialize)]
pub struct CreatePrResult {
    pub number: i32,
    pub html_url: String,
}

pub async fn create_pr(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    title: &str,
    body: &str,
    head: &str,
    base: &str,
    draft: bool,
) -> Result<CreatePrResult, String> {
    let resp = client
        .post(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({
            "title": title,
            "body": body,
            "head": head,
            "base": base,
            "draft": draft,
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to create PR: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;
    Ok(CreatePrResult {
        number: json["number"].as_i64().unwrap_or(0) as i32,
        html_url: json["html_url"].as_str().unwrap_or("").to_string(),
    })
}
