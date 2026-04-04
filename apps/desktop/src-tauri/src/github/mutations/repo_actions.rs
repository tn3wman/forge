use reqwest::Client;

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepoResult {
    pub github_id: i64,
    pub full_name: String,
    pub name: String,
    pub owner: String,
    pub is_private: bool,
    pub default_branch: String,
    pub clone_url: String,
    pub html_url: String,
}

pub async fn create_repo(
    client: &Client,
    token: &str,
    name: &str,
    description: Option<&str>,
    private: bool,
    auto_init: bool,
    gitignore_template: Option<&str>,
    license_template: Option<&str>,
) -> Result<CreateRepoResult, String> {
    let mut body = serde_json::json!({
        "name": name,
        "private": private,
        "auto_init": auto_init,
    });

    if let Some(desc) = description {
        if !desc.is_empty() {
            body["description"] = serde_json::Value::String(desc.to_string());
        }
    }
    if let Some(gi) = gitignore_template {
        if !gi.is_empty() {
            body["gitignore_template"] = serde_json::Value::String(gi.to_string());
        }
    }
    if let Some(lic) = license_template {
        if !lic.is_empty() {
            body["license_template"] = serde_json::Value::String(lic.to_string());
        }
    }

    let resp = client
        .post(format!("{GITHUB_API_BASE}/user/repos"))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to create repository: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    Ok(CreateRepoResult {
        github_id: json["id"].as_i64().unwrap_or(0),
        full_name: json["full_name"].as_str().unwrap_or("").to_string(),
        name: json["name"].as_str().unwrap_or("").to_string(),
        owner: json["owner"]["login"].as_str().unwrap_or("").to_string(),
        is_private: json["private"].as_bool().unwrap_or(false),
        default_branch: json["default_branch"]
            .as_str()
            .unwrap_or("main")
            .to_string(),
        clone_url: json["clone_url"].as_str().unwrap_or("").to_string(),
        html_url: json["html_url"].as_str().unwrap_or("").to_string(),
    })
}
