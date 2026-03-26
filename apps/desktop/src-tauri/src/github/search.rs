use reqwest::Client;
use serde::{Deserialize, Serialize};

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Deserialize)]
struct SearchResponse {
    items: Vec<SearchItemRaw>,
}

#[derive(Debug, Deserialize)]
struct SearchItemRaw {
    number: i32,
    title: String,
    state: String,
    html_url: String,
    user: SearchUser,
    created_at: String,
    updated_at: String,
    pull_request: Option<serde_json::Value>,
    repository_url: String,
    labels: Vec<SearchLabel>,
}

#[derive(Debug, Deserialize)]
struct SearchUser {
    login: String,
    avatar_url: String,
}

#[derive(Debug, Deserialize)]
struct SearchLabel {
    name: String,
    color: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultItem {
    pub number: i32,
    pub title: String,
    pub state: String,
    pub html_url: String,
    pub author_login: String,
    pub author_avatar_url: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_pull_request: bool,
    pub repo_full_name: String,
    pub labels: Vec<SearchResultLabel>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultLabel {
    pub name: String,
    pub color: String,
}

pub async fn search_issues_and_prs(
    client: &Client,
    token: &str,
    query: &str,
    repos: &[(String, String)],
) -> Result<Vec<SearchResultItem>, String> {
    let repo_qualifiers: Vec<String> = repos
        .iter()
        .map(|(owner, name)| format!("repo:{owner}/{name}"))
        .collect();
    let full_query = if repo_qualifiers.is_empty() {
        query.to_string()
    } else {
        format!("{query} {}", repo_qualifiers.join(" "))
    };

    let resp = client
        .get(format!("{GITHUB_API_BASE}/search/issues"))
        .query(&[
            ("q", full_query.as_str()),
            ("per_page", "30"),
            ("sort", "updated"),
        ])
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to search: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }

    let search: SearchResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse search results: {e}"))?;

    Ok(search
        .items
        .into_iter()
        .map(|item| {
            let repo_full_name = item
                .repository_url
                .rsplit("repos/")
                .next()
                .unwrap_or("")
                .to_string();
            SearchResultItem {
                number: item.number,
                title: item.title,
                state: item.state,
                html_url: item.html_url,
                author_login: item.user.login,
                author_avatar_url: item.user.avatar_url,
                created_at: item.created_at,
                updated_at: item.updated_at,
                is_pull_request: item.pull_request.is_some(),
                repo_full_name,
                labels: item
                    .labels
                    .into_iter()
                    .map(|l| SearchResultLabel {
                        name: l.name,
                        color: l.color,
                    })
                    .collect(),
            }
        })
        .collect())
}
