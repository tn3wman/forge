use reqwest::Client;

const GITHUB_API_BASE: &str = "https://api.github.com";

pub async fn submit_review(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    pr_number: i32,
    event: &str,
    body: &str,
) -> Result<(), String> {
    let resp = client
        .post(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "event": event, "body": body }))
        .send()
        .await
        .map_err(|e| format!("Failed to submit review: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }

    Ok(())
}
