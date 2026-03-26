use reqwest::Client;
use serde::Serialize;
use serde_json::Value;

use crate::github::graphql::execute_graphql;

const LIST_PULL_REQUESTS_QUERY: &str = r#"
query($owner: String!, $repo: String!, $states: [PullRequestState!]) {
  repository(owner: $owner, name: $repo) {
    pullRequests(first: 50, states: $states, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        number
        title
        state
        isDraft
        author { login avatarUrl }
        headRefName
        baseRefName
        body
        reviewDecision
        additions
        deletions
        changedFiles
        labels(first: 10) { nodes { name } }
        createdAt
        updatedAt
        mergedAt
      }
    }
  }
}
"#;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestItem {
    pub id: String,
    pub number: i32,
    pub title: String,
    pub state: String,
    pub author_login: String,
    pub author_avatar_url: String,
    pub head_ref: String,
    pub base_ref: String,
    pub body: String,
    pub draft: bool,
    pub review_decision: Option<String>,
    pub additions: i32,
    pub deletions: i32,
    pub changed_files: i32,
    pub labels: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub merged_at: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_open_prs: i32,
    pub total_open_issues: i32,
    pub prs_needing_review: i32,
    pub recently_merged: i32,
}

pub async fn list_pull_requests(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    state: Option<&str>,
) -> Result<Vec<PullRequestItem>, String> {
    let states: Value = match state {
        Some("open") => serde_json::json!(["OPEN"]),
        Some("closed") => serde_json::json!(["CLOSED", "MERGED"]),
        _ => Value::Null,
    };

    let variables = serde_json::json!({
        "owner": owner,
        "repo": repo,
        "states": states,
    });

    let data = execute_graphql(client, token, LIST_PULL_REQUESTS_QUERY, variables).await?;

    let nodes = data
        .get("repository")
        .and_then(|r| r.get("pullRequests"))
        .and_then(|prs| prs.get("nodes"))
        .and_then(|n| n.as_array())
        .ok_or_else(|| "Failed to parse pull requests from GraphQL response".to_string())?;

    let mut items = Vec::new();
    for node in nodes {
        let state_raw = node["state"].as_str().unwrap_or("OPEN");
        let merged_at = node["mergedAt"].as_str().map(|s| s.to_string());
        let state_str = match state_raw {
            "OPEN" => "open",
            "CLOSED" => {
                if merged_at.is_some() {
                    "merged"
                } else {
                    "closed"
                }
            }
            "MERGED" => "merged",
            other => other,
        };

        let labels = node["labels"]["nodes"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|l| l["name"].as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        items.push(PullRequestItem {
            id: node["id"].as_str().unwrap_or_default().to_string(),
            number: node["number"].as_i64().unwrap_or(0) as i32,
            title: node["title"].as_str().unwrap_or_default().to_string(),
            state: state_str.to_string(),
            author_login: node["author"]["login"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            author_avatar_url: node["author"]["avatarUrl"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            head_ref: node["headRefName"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            base_ref: node["baseRefName"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            body: node["body"].as_str().unwrap_or_default().to_string(),
            draft: node["isDraft"].as_bool().unwrap_or(false),
            review_decision: node["reviewDecision"].as_str().map(|s| s.to_string()),
            additions: node["additions"].as_i64().unwrap_or(0) as i32,
            deletions: node["deletions"].as_i64().unwrap_or(0) as i32,
            changed_files: node["changedFiles"].as_i64().unwrap_or(0) as i32,
            labels,
            created_at: node["createdAt"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            updated_at: node["updatedAt"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            merged_at,
        });
    }

    Ok(items)
}
