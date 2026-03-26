use reqwest::Client;

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
