use reqwest::Client;
use serde::Serialize;
use serde_json::Value;

use crate::github::graphql::execute_graphql;

const PR_DETAIL_QUERY: &str = r#"
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
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
      mergeable
      reviews(first: 50) {
        nodes {
          id
          state
          body
          submittedAt
          author { login avatarUrl }
          comments(first: 50) {
            nodes {
              id
              body
              path
              line
              author { login avatarUrl }
              createdAt
              updatedAt
            }
          }
        }
      }
      commits(last: 1) {
        totalCount
        nodes {
          commit {
            statusCheckRollup {
              contexts(first: 50) {
                nodes {
                  __typename
                  ... on StatusContext { context state description targetUrl }
                  ... on CheckRun { name conclusion detailsUrl title }
                }
              }
            }
          }
        }
      }
      timelineItems(first: 100, itemTypes: [ISSUE_COMMENT, LABELED_EVENT, UNLABELED_EVENT, CLOSED_EVENT, REOPENED_EVENT, MERGED_EVENT, HEAD_REF_FORCE_PUSHED_EVENT, REVIEW_REQUESTED_EVENT]) {
        nodes {
          __typename
          ... on IssueComment { id body author { login avatarUrl } createdAt }
          ... on LabeledEvent { label { name } actor { login avatarUrl } createdAt }
          ... on UnlabeledEvent { label { name } actor { login avatarUrl } createdAt }
          ... on ClosedEvent { actor { login avatarUrl } createdAt }
          ... on ReopenedEvent { actor { login avatarUrl } createdAt }
          ... on MergedEvent { actor { login avatarUrl } createdAt }
        }
      }
    }
  }
}
"#;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrDetailResult {
    pub id: String,
    pub number: i32,
    pub title: String,
    pub state: String,
    pub draft: bool,
    pub author_login: String,
    pub author_avatar_url: String,
    pub head_ref: String,
    pub base_ref: String,
    pub body: String,
    pub review_decision: Option<String>,
    pub additions: i32,
    pub deletions: i32,
    pub changed_files: i32,
    pub labels: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub merged_at: Option<String>,
    pub mergeable: String,
    pub total_commits: i32,
    pub reviews: Vec<PrReview>,
    pub status_checks: Vec<StatusCheck>,
    pub timeline: Vec<TimelineEvent>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrReview {
    pub id: String,
    pub state: String,
    pub body: String,
    pub submitted_at: Option<String>,
    pub author_login: String,
    pub author_avatar_url: String,
    pub comments: Vec<ReviewComment>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReviewComment {
    pub id: String,
    pub body: String,
    pub path: Option<String>,
    pub line: Option<i32>,
    pub author_login: String,
    pub author_avatar_url: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StatusCheck {
    pub name: String,
    pub status: String,
    pub description: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    pub event_type: String,
    pub actor_login: Option<String>,
    pub actor_avatar_url: Option<String>,
    pub created_at: Option<String>,
    // For IssueComment
    pub id: Option<String>,
    pub body: Option<String>,
    // For LabeledEvent / UnlabeledEvent
    pub label: Option<String>,
    // For MergedEvent
    pub commit_url: Option<String>,
}

pub async fn get_pr_detail(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    number: i32,
) -> Result<PrDetailResult, String> {
    let variables = serde_json::json!({
        "owner": owner,
        "repo": repo,
        "number": number,
    });

    let data = execute_graphql(client, token, PR_DETAIL_QUERY, variables).await?;

    let pr = data
        .get("repository")
        .and_then(|r| r.get("pullRequest"))
        .ok_or_else(|| "Failed to parse pull request detail from GraphQL response".to_string())?;

    let state_raw = pr["state"].as_str().unwrap_or("OPEN");
    let merged_at = pr["mergedAt"].as_str().map(|s| s.to_string());
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

    let labels = pr["labels"]["nodes"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|l| l["name"].as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let reviews = parse_reviews(&pr["reviews"]["nodes"]);
    let status_checks = parse_status_checks(&pr["commits"]);
    let timeline = parse_timeline(&pr["timelineItems"]["nodes"]);
    let total_commits = pr["commits"]["totalCount"].as_i64().unwrap_or(0) as i32;

    let mergeable = pr["mergeable"].as_str().unwrap_or("UNKNOWN").to_string();

    Ok(PrDetailResult {
        id: pr["id"].as_str().unwrap_or_default().to_string(),
        number: pr["number"].as_i64().unwrap_or(0) as i32,
        title: pr["title"].as_str().unwrap_or_default().to_string(),
        state: state_str.to_string(),
        draft: pr["isDraft"].as_bool().unwrap_or(false),
        author_login: pr["author"]["login"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        author_avatar_url: pr["author"]["avatarUrl"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        head_ref: pr["headRefName"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        base_ref: pr["baseRefName"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        body: pr["body"].as_str().unwrap_or_default().to_string(),
        review_decision: pr["reviewDecision"].as_str().map(|s| s.to_string()),
        additions: pr["additions"].as_i64().unwrap_or(0) as i32,
        deletions: pr["deletions"].as_i64().unwrap_or(0) as i32,
        changed_files: pr["changedFiles"].as_i64().unwrap_or(0) as i32,
        labels,
        created_at: pr["createdAt"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        updated_at: pr["updatedAt"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        merged_at,
        mergeable,
        total_commits,
        reviews,
        status_checks,
        timeline,
    })
}

fn parse_reviews(nodes: &Value) -> Vec<PrReview> {
    let arr = match nodes.as_array() {
        Some(a) => a,
        None => return Vec::new(),
    };

    arr.iter()
        .map(|node| {
            let comments = node["comments"]["nodes"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .map(|c| ReviewComment {
                            id: c["id"].as_str().unwrap_or_default().to_string(),
                            body: c["body"].as_str().unwrap_or_default().to_string(),
                            path: c["path"].as_str().map(|s| s.to_string()),
                            line: c["line"].as_i64().map(|n| n as i32),
                            author_login: c["author"]["login"]
                                .as_str()
                                .unwrap_or_default()
                                .to_string(),
                            author_avatar_url: c["author"]["avatarUrl"]
                                .as_str()
                                .unwrap_or_default()
                                .to_string(),
                            created_at: c["createdAt"]
                                .as_str()
                                .unwrap_or_default()
                                .to_string(),
                            updated_at: c["updatedAt"]
                                .as_str()
                                .unwrap_or_default()
                                .to_string(),
                        })
                        .collect()
                })
                .unwrap_or_default();

            PrReview {
                id: node["id"].as_str().unwrap_or_default().to_string(),
                state: node["state"].as_str().unwrap_or_default().to_string(),
                body: node["body"].as_str().unwrap_or_default().to_string(),
                submitted_at: node["submittedAt"].as_str().map(|s| s.to_string()),
                author_login: node["author"]["login"]
                    .as_str()
                    .unwrap_or_default()
                    .to_string(),
                author_avatar_url: node["author"]["avatarUrl"]
                    .as_str()
                    .unwrap_or_default()
                    .to_string(),
                comments,
            }
        })
        .collect()
}

fn parse_status_checks(commits: &Value) -> Vec<StatusCheck> {
    let contexts = commits
        .get("nodes")
        .and_then(|n| n.as_array())
        .and_then(|arr| arr.first())
        .and_then(|node| node.get("commit"))
        .and_then(|c| c.get("statusCheckRollup"))
        .and_then(|r| r.get("contexts"))
        .and_then(|c| c.get("nodes"))
        .and_then(|n| n.as_array());

    let arr = match contexts {
        Some(a) => a,
        None => return Vec::new(),
    };

    arr.iter()
        .map(|node| {
            let typename = node["__typename"].as_str().unwrap_or("");
            match typename {
                "StatusContext" => StatusCheck {
                    name: node["context"].as_str().unwrap_or_default().to_string(),
                    status: node["state"].as_str().unwrap_or_default().to_string(),
                    description: node["description"].as_str().map(|s| s.to_string()),
                    url: node["targetUrl"].as_str().map(|s| s.to_string()),
                },
                "CheckRun" => StatusCheck {
                    name: node["name"].as_str().unwrap_or_default().to_string(),
                    status: node["conclusion"]
                        .as_str()
                        .unwrap_or("IN_PROGRESS")
                        .to_string(),
                    description: node["title"].as_str().map(|s| s.to_string()),
                    url: node["detailsUrl"].as_str().map(|s| s.to_string()),
                },
                _ => StatusCheck {
                    name: "unknown".to_string(),
                    status: "unknown".to_string(),
                    description: None,
                    url: None,
                },
            }
        })
        .collect()
}

fn parse_timeline(nodes: &Value) -> Vec<TimelineEvent> {
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
                "MergedEvent" => "merged",
                "HeadRefForcePushedEvent" => "force_pushed",
                "ReviewRequestedEvent" => "review_requested",
                other => other,
            };

            // actor vs author depending on event type
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

            TimelineEvent {
                event_type: event_type.to_string(),
                actor_login,
                actor_avatar_url,
                created_at: node["createdAt"].as_str().map(|s| s.to_string()),
                id: node["id"].as_str().map(|s| s.to_string()),
                body: node["body"].as_str().map(|s| s.to_string()),
                label: node["label"]["name"].as_str().map(|s| s.to_string()),
                commit_url: node["commitUrl"].as_str().map(|s| s.to_string()),
            }
        })
        .collect()
}
