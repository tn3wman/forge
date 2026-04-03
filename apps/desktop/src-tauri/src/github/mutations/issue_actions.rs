use reqwest::Client;

const GITHUB_API_BASE: &str = "https://api.github.com";

pub async fn close_issue(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    issue_number: i32,
) -> Result<(), String> {
    let resp = client
        .patch(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "state": "closed" }))
        .send()
        .await
        .map_err(|e| format!("Failed to close issue: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn reopen_issue(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    issue_number: i32,
) -> Result<(), String> {
    let resp = client
        .patch(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "state": "open" }))
        .send()
        .await
        .map_err(|e| format!("Failed to reopen issue: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn update_issue(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    issue_number: i32,
    title: Option<&str>,
    body: Option<&str>,
) -> Result<(), String> {
    let mut payload = serde_json::Map::new();
    if let Some(t) = title {
        payload.insert("title".to_string(), serde_json::json!(t));
    }
    if let Some(b) = body {
        payload.insert("body".to_string(), serde_json::json!(b));
    }

    let resp = client
        .patch(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::Value::Object(payload))
        .send()
        .await
        .map_err(|e| format!("Failed to update issue: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn lock_issue(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    issue_number: i32,
    lock_reason: Option<&str>,
) -> Result<(), String> {
    let body = lock_reason
        .map(|r| serde_json::json!({ "lock_reason": r }))
        .unwrap_or(serde_json::json!({}));

    let resp = client
        .put(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}/lock"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to lock issue: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn unlock_issue(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    issue_number: i32,
) -> Result<(), String> {
    let resp = client
        .delete(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}/lock"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to unlock issue: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn set_issue_labels(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    issue_number: i32,
    labels: &[String],
) -> Result<(), String> {
    let resp = client
        .put(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}/labels"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "labels": labels }))
        .send()
        .await
        .map_err(|e| format!("Failed to set labels: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

pub async fn set_issue_assignees(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    issue_number: i32,
    assignees: &[String],
) -> Result<(), String> {
    // The PATCH issues endpoint can set assignees directly
    let resp = client
        .patch(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({ "assignees": assignees }))
        .send()
        .await
        .map_err(|e| format!("Failed to set assignees: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    Ok(())
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueResult {
    pub number: i32,
    pub html_url: String,
}

pub async fn create_issue(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    title: &str,
    body: &str,
    labels: &[String],
    assignees: &[String],
) -> Result<CreateIssueResult, String> {
    let resp = client
        .post(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/issues"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&serde_json::json!({
            "title": title,
            "body": body,
            "labels": labels,
            "assignees": assignees,
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to create issue: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;
    Ok(CreateIssueResult {
        number: json["number"].as_i64().unwrap_or(0) as i32,
        html_url: json["html_url"].as_str().unwrap_or("").to_string(),
    })
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoLabel {
    pub name: String,
    pub color: String,
    pub description: Option<String>,
}

pub async fn list_repo_labels(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
) -> Result<Vec<RepoLabel>, String> {
    let resp = client
        .get(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/labels?per_page=100"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to list labels: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let raw: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse labels: {e}"))?;

    Ok(raw
        .iter()
        .map(|l| RepoLabel {
            name: l["name"].as_str().unwrap_or("").to_string(),
            color: l["color"].as_str().unwrap_or("").to_string(),
            description: l["description"].as_str().map(|s| s.to_string()),
        })
        .collect())
}

pub async fn list_repo_assignees(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
) -> Result<Vec<String>, String> {
    let resp = client
        .get(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/assignees?per_page=100"
        ))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to list assignees: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let raw: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse assignees: {e}"))?;

    Ok(raw
        .iter()
        .filter_map(|u| u["login"].as_str().map(|s| s.to_string()))
        .collect())
}
