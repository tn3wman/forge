use reqwest::Client;
use serde::Serialize;
use serde_json::Value;

use crate::github::graphql::execute_graphql;

const ISSUE_DETAIL_QUERY: &str = r#"
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
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
      timelineItems(first: 100, itemTypes: [ISSUE_COMMENT, LABELED_EVENT, UNLABELED_EVENT, CLOSED_EVENT, REOPENED_EVENT, CROSS_REFERENCED_EVENT]) {
        nodes {
          __typename
          ... on IssueComment { id body author { login avatarUrl } createdAt }
          ... on LabeledEvent { label { name } actor { login avatarUrl } createdAt }
          ... on UnlabeledEvent { label { name } actor { login avatarUrl } createdAt }
          ... on ClosedEvent { actor { login avatarUrl } createdAt }
          ... on ReopenedEvent { actor { login avatarUrl } createdAt }
          ... on CrossReferencedEvent {
            actor { login avatarUrl }
            createdAt
            willCloseTarget
            source {
              __typename
              ... on PullRequest {
                number
                title
                state
                headRefName
                repository { nameWithOwner }
              }
            }
          }
        }
      }
    }
  }
}
"#;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LinkedPrRef {
    pub number: i32,
    pub title: String,
    pub state: String,
    pub repo_full_name: String,
    pub will_close_target: bool,
    pub head_ref: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IssueDetailResult {
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
    pub timeline: Vec<IssueTimelineEvent>,
    pub linked_pull_requests: Vec<LinkedPrRef>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IssueTimelineEvent {
    pub event_type: String,
    pub actor_login: Option<String>,
    pub actor_avatar_url: Option<String>,
    pub created_at: Option<String>,
    pub id: Option<String>,
    pub body: Option<String>,
    pub label: Option<String>,
    // CrossReferencedEvent fields
    pub source_number: Option<i32>,
    pub source_title: Option<String>,
    pub source_type: Option<String>,
    pub source_state: Option<String>,
    pub source_repo: Option<String>,
    pub will_close_target: Option<bool>,
}

pub async fn get_issue_detail(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    number: i32,
) -> Result<IssueDetailResult, String> {
    let variables = serde_json::json!({
        "owner": owner,
        "repo": repo,
        "number": number,
    });

    let data = execute_graphql(client, token, ISSUE_DETAIL_QUERY, variables).await?;

    let issue = data
        .get("repository")
        .and_then(|r| r.get("issue"))
        .ok_or_else(|| "Failed to parse issue detail from GraphQL response".to_string())?;

    let state_raw = issue["state"].as_str().unwrap_or("OPEN");
    let state_str = match state_raw {
        "OPEN" => "open",
        "CLOSED" => "closed",
        other => other,
    };

    let labels = issue["labels"]["nodes"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|l| l["name"].as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let assignees = issue["assignees"]["nodes"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|a| a["login"].as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let timeline = parse_issue_timeline(&issue["timelineItems"]["nodes"]);
    let linked_pull_requests = extract_linked_prs(&issue["timelineItems"]["nodes"]);

    Ok(IssueDetailResult {
        id: issue["id"].as_str().unwrap_or_default().to_string(),
        number: issue["number"].as_i64().unwrap_or(0) as i32,
        title: issue["title"].as_str().unwrap_or_default().to_string(),
        state: state_str.to_string(),
        author_login: issue["author"]["login"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        author_avatar_url: issue["author"]["avatarUrl"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        body: issue["body"].as_str().unwrap_or_default().to_string(),
        labels,
        assignees,
        locked: issue["locked"].as_bool().unwrap_or(false),
        active_lock_reason: issue["activeLockReason"].as_str().map(|s| s.to_string()),
        created_at: issue["createdAt"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        updated_at: issue["updatedAt"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        closed_at: issue["closedAt"].as_str().map(|s| s.to_string()),
        timeline,
        linked_pull_requests,
    })
}

fn parse_issue_timeline(nodes: &Value) -> Vec<IssueTimelineEvent> {
    let arr = match nodes.as_array() {
        Some(a) => a,
        None => return Vec::new(),
    };

    arr.iter()
        .map(|node| {
            let typename = node["__typename"].as_str().unwrap_or("Unknown");
            let event_type = match typename {
                "IssueComment" => "comment",
                "LabeledEvent" => "labeled",
                "UnlabeledEvent" => "unlabeled",
                "ClosedEvent" => "closed",
                "ReopenedEvent" => "reopened",
                "CrossReferencedEvent" => "cross_referenced",
                other => other,
            };

            let (actor_login, actor_avatar_url) = if typename == "IssueComment" {
                (
                    node["author"]["login"].as_str().map(|s| s.to_string()),
                    node["author"]["avatarUrl"].as_str().map(|s| s.to_string()),
                )
            } else {
                (
                    node["actor"]["login"].as_str().map(|s| s.to_string()),
                    node["actor"]["avatarUrl"].as_str().map(|s| s.to_string()),
                )
            };

            let (source_number, source_title, source_type, source_state, source_repo, will_close_target) =
                if typename == "CrossReferencedEvent" {
                    let source = &node["source"];
                    let source_typename = source["__typename"].as_str();
                    (
                        source["number"].as_i64().map(|n| n as i32),
                        source["title"].as_str().map(|s| s.to_string()),
                        source_typename.map(|s| s.to_string()),
                        source["state"].as_str().map(|s| s.to_string()),
                        source["repository"]["nameWithOwner"].as_str().map(|s| s.to_string()),
                        node["willCloseTarget"].as_bool(),
                    )
                } else {
                    (None, None, None, None, None, None)
                };

            IssueTimelineEvent {
                event_type: event_type.to_string(),
                actor_login,
                actor_avatar_url,
                created_at: node["createdAt"].as_str().map(|s| s.to_string()),
                id: node["id"].as_str().map(|s| s.to_string()),
                body: node["body"].as_str().map(|s| s.to_string()),
                label: node["label"]["name"].as_str().map(|s| s.to_string()),
                source_number,
                source_title,
                source_type,
                source_state,
                source_repo,
                will_close_target,
            }
        })
        .collect()
}

fn extract_linked_prs(nodes: &Value) -> Vec<LinkedPrRef> {
    let arr = match nodes.as_array() {
        Some(a) => a,
        None => return Vec::new(),
    };

    let mut result = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for node in arr {
        if node["__typename"].as_str() != Some("CrossReferencedEvent") {
            continue;
        }
        let source = &node["source"];
        if source["__typename"].as_str() != Some("PullRequest") {
            continue;
        }
        let number = match source["number"].as_i64() {
            Some(n) => n as i32,
            None => continue,
        };
        if !seen.insert(number) {
            continue;
        }

        let state_raw = source["state"].as_str().unwrap_or("OPEN");
        let state = match state_raw {
            "OPEN" => "open",
            "CLOSED" => "closed",
            "MERGED" => "merged",
            other => other,
        };

        result.push(LinkedPrRef {
            number,
            title: source["title"].as_str().unwrap_or_default().to_string(),
            state: state.to_string(),
            repo_full_name: source["repository"]["nameWithOwner"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            will_close_target: node["willCloseTarget"].as_bool().unwrap_or(false),
            head_ref: source["headRefName"].as_str().map(|s| s.to_string()),
        });
    }

    result
}
