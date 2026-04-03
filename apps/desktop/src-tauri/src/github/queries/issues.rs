use reqwest::Client;
use serde::Serialize;
use serde_json::Value;

use crate::github::graphql::execute_graphql;

const LIST_ISSUES_QUERY: &str = r#"
query($owner: String!, $repo: String!, $states: [IssueState!]) {
  repository(owner: $owner, name: $repo) {
    issues(first: 50, states: $states, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        number
        title
        state
        author { login avatarUrl }
        body
        labels(first: 10) { nodes { name } }
        assignees(first: 10) { nodes { login } }
        locked
        activeLockReason
        createdAt
        updatedAt
        closedAt
      }
    }
  }
}
"#;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IssueItem {
    pub id: String,
    pub number: i32,
    pub title: String,
    pub state: String,
    pub author_login: String,
    pub author_avatar_url: String,
    pub body: String,
    pub labels: Vec<String>,
    pub assignees: Vec<String>,
    pub locked: bool,
    pub active_lock_reason: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub closed_at: Option<String>,
}

pub async fn list_issues(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    state: Option<&str>,
) -> Result<Vec<IssueItem>, String> {
    let states: Value = match state {
        Some("open") => serde_json::json!(["OPEN"]),
        Some("closed") => serde_json::json!(["CLOSED"]),
        _ => Value::Null,
    };

    let variables = serde_json::json!({
        "owner": owner,
        "repo": repo,
        "states": states,
    });

    let data = execute_graphql(client, token, LIST_ISSUES_QUERY, variables).await?;

    let nodes = data
        .get("repository")
        .and_then(|r| r.get("issues"))
        .and_then(|issues| issues.get("nodes"))
        .and_then(|n| n.as_array())
        .ok_or_else(|| "Failed to parse issues from GraphQL response".to_string())?;

    let mut items = Vec::new();
    for node in nodes {
        let state_raw = node["state"].as_str().unwrap_or("OPEN");
        let state_str = match state_raw {
            "OPEN" => "open",
            "CLOSED" => "closed",
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

        let assignees = node["assignees"]["nodes"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|a| a["login"].as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        items.push(IssueItem {
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
            body: node["body"].as_str().unwrap_or_default().to_string(),
            labels,
            assignees,
            locked: node["locked"].as_bool().unwrap_or(false),
            active_lock_reason: node["activeLockReason"].as_str().map(|s| s.to_string()),
            created_at: node["createdAt"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            updated_at: node["updatedAt"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            closed_at: node["closedAt"].as_str().map(|s| s.to_string()),
        });
    }

    Ok(items)
}
