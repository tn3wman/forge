use crate::models::auth::GitHubUser;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Deserialize)]
struct SearchReposResponse {
    items: Vec<GitHubRepoRaw>,
}

#[derive(Debug, Deserialize)]
struct GitHubRepoRaw {
    id: i64,
    full_name: String,
    name: String,
    owner: RepoOwner,
    private: bool,
    default_branch: String,
    description: Option<String>,
    stargazers_count: u32,
}

#[derive(Debug, Deserialize)]
struct RepoOwner {
    login: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRepoResult {
    pub github_id: i64,
    pub full_name: String,
    pub name: String,
    pub owner: String,
    pub is_private: bool,
    pub default_branch: String,
    pub description: Option<String>,
    pub stars: u32,
}

pub async fn get_authenticated_user(client: &Client, token: &str) -> Result<GitHubUser, String> {
    let resp = client
        .get(format!("{GITHUB_API_BASE}/user"))
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch user: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }

    resp.json::<GitHubUser>()
        .await
        .map_err(|e| format!("Failed to parse user: {e}"))
}

pub async fn search_repos(
    client: &Client,
    token: &str,
    query: &str,
) -> Result<Vec<SearchRepoResult>, String> {
    let resp = client
        .get(format!("{GITHUB_API_BASE}/search/repositories"))
        .query(&[("q", query), ("per_page", "20"), ("sort", "updated")])
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to search repos: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }

    let search: SearchReposResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse search results: {e}"))?;

    Ok(search
        .items
        .into_iter()
        .map(|r| SearchRepoResult {
            github_id: r.id,
            full_name: r.full_name,
            name: r.name,
            owner: r.owner.login,
            is_private: r.private,
            default_branch: r.default_branch,
            description: r.description,
            stars: r.stargazers_count,
        })
        .collect())
}

// --- PR Commits ---

#[derive(Debug, Deserialize)]
struct PrCommitRaw {
    sha: String,
    commit: PrCommitInner,
    author: Option<PrCommitAuthor>,
}

#[derive(Debug, Deserialize)]
struct PrCommitInner {
    message: String,
    author: PrCommitGitAuthor,
}

#[derive(Debug, Deserialize)]
struct PrCommitGitAuthor {
    date: String,
}

#[derive(Debug, Deserialize)]
struct PrCommitAuthor {
    login: String,
    avatar_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrCommitItem {
    pub sha: String,
    pub message_headline: String,
    pub message_body: String,
    pub author_login: String,
    pub author_avatar_url: String,
    pub authored_date: String,
    pub additions: i32,
    pub deletions: i32,
}

pub async fn get_pr_commits(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    pr_number: i32,
) -> Result<Vec<PrCommitItem>, String> {
    let resp = client
        .get(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/commits"
        ))
        .query(&[("per_page", "100")])
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch PR commits: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }

    let raw: Vec<PrCommitRaw> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse PR commits: {e}"))?;

    Ok(raw
        .into_iter()
        .map(|c| {
            let (headline, body) = match c.commit.message.split_once("\n\n") {
                Some((h, b)) => (h.to_string(), b.to_string()),
                None => (c.commit.message.clone(), String::new()),
            };
            PrCommitItem {
                sha: c.sha,
                message_headline: headline,
                message_body: body,
                author_login: c.author.as_ref().map(|a| a.login.clone()).unwrap_or_default(),
                author_avatar_url: c
                    .author
                    .as_ref()
                    .map(|a| a.avatar_url.clone())
                    .unwrap_or_default(),
                authored_date: c.commit.author.date,
                additions: 0,
                deletions: 0,
            }
        })
        .collect())
}

// --- PR Files ---

#[derive(Debug, Deserialize)]
struct PrFileRaw {
    filename: String,
    additions: i32,
    deletions: i32,
    patch: Option<String>,
    status: String,
    previous_filename: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrFileItem {
    pub path: String,
    pub additions: i32,
    pub deletions: i32,
    pub patch: String,
    pub status: String,
    pub previous_path: Option<String>,
}

pub async fn get_pr_files(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    pr_number: i32,
) -> Result<Vec<PrFileItem>, String> {
    let resp = client
        .get(format!(
            "{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/files"
        ))
        .query(&[("per_page", "100")])
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch PR files: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }

    let raw: Vec<PrFileRaw> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse PR files: {e}"))?;

    Ok(raw
        .into_iter()
        .map(|f| PrFileItem {
            path: f.filename,
            additions: f.additions,
            deletions: f.deletions,
            patch: f.patch.unwrap_or_default(),
            status: f.status,
            previous_path: f.previous_filename,
        })
        .collect())
}

pub async fn list_user_repos(
    client: &Client,
    token: &str,
) -> Result<Vec<SearchRepoResult>, String> {
    let resp = client
        .get(format!("{GITHUB_API_BASE}/user/repos"))
        .query(&[("per_page", "100"), ("sort", "updated"), ("affiliation", "owner,collaborator,organization_member")])
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to list repos: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {body}"));
    }

    let repos: Vec<GitHubRepoRaw> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse repos: {e}"))?;

    Ok(repos
        .into_iter()
        .map(|r| SearchRepoResult {
            github_id: r.id,
            full_name: r.full_name,
            name: r.name,
            owner: r.owner.login,
            is_private: r.private,
            default_branch: r.default_branch,
            description: r.description,
            stars: r.stargazers_count,
        })
        .collect())
}
