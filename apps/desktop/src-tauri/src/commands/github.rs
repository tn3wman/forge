use serde::Deserialize;

use crate::github::client::{self as gh_client, PrCommitItem, PrFileItem, SearchRepoResult};
use crate::github::mutations::{comments, issue_actions, pr_actions, reviews};
use crate::github::mutations::comments::CommentResult;
use crate::github::queries::issue_detail;
use crate::github::queries::issues::{self, IssueItem};
use crate::github::queries::pr_detail;
use crate::github::queries::pull_requests::{self, DashboardStats, PullRequestItem};
use crate::keychain::TokenCache;

#[tauri::command]
pub async fn github_search_repos(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    query: String,
) -> Result<Vec<SearchRepoResult>, String> {
    let token = cache.require_token()?;
    gh_client::search_repos(&client, &token, &query).await
}

#[tauri::command]
pub async fn github_list_user_repos(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
) -> Result<Vec<SearchRepoResult>, String> {
    let token = cache.require_token()?;
    gh_client::list_user_repos(&client, &token).await
}

#[tauri::command]
pub async fn github_list_prs(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    state: Option<String>,
) -> Result<Vec<PullRequestItem>, String> {
    let token = cache.require_token()?;
    pull_requests::list_pull_requests(
        &client,
        &token,
        &owner,
        &repo,
        state.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn github_list_issues(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    state: Option<String>,
) -> Result<Vec<IssueItem>, String> {
    let token = cache.require_token()?;
    issues::list_issues(&client, &token, &owner, &repo, state.as_deref()).await
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoRef {
    pub owner: String,
    pub repo: String,
}

#[tauri::command]
pub async fn github_get_dashboard(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    repos: Vec<RepoRef>,
) -> Result<DashboardStats, String> {
    let token = cache.require_token()?;
    let mut total_open_prs: i32 = 0;
    let mut total_open_issues: i32 = 0;
    let mut prs_needing_review: i32 = 0;
    let mut recently_merged: i32 = 0;

    for repo_ref in &repos {
        let prs = pull_requests::list_pull_requests(
            &client,
            &token,
            &repo_ref.owner,
            &repo_ref.repo,
            None,
        )
        .await
        .unwrap_or_default();

        for pr in &prs {
            match pr.state.as_str() {
                "open" => {
                    total_open_prs += 1;
                    if pr.review_decision.as_deref() == Some("REVIEW_REQUIRED") {
                        prs_needing_review += 1;
                    }
                }
                "merged" => {
                    recently_merged += 1;
                }
                _ => {}
            }
        }

        let issue_items = issues::list_issues(
            &client,
            &token,
            &repo_ref.owner,
            &repo_ref.repo,
            Some("open"),
        )
        .await
        .unwrap_or_default();

        total_open_issues += issue_items.len() as i32;
    }

    Ok(DashboardStats {
        total_open_prs,
        total_open_issues,
        prs_needing_review,
        recently_merged,
    })
}

#[tauri::command]
pub async fn github_get_pr_detail(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<pr_detail::PrDetailResult, String> {
    let token = cache.require_token()?;
    pr_detail::get_pr_detail(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_get_pr_commits(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<Vec<PrCommitItem>, String> {
    let token = cache.require_token()?;
    gh_client::get_pr_commits(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_get_pr_files(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<Vec<PrFileItem>, String> {
    let token = cache.require_token()?;
    gh_client::get_pr_files(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_get_issue_detail(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<issue_detail::IssueDetailResult, String> {
    let token = cache.require_token()?;
    issue_detail::get_issue_detail(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_submit_review(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
    event: String,
    body: String,
) -> Result<(), String> {
    let token = cache.require_token()?;
    reviews::submit_review(&client, &token, &owner, &repo, number, &event, &body).await
}

#[tauri::command]
pub async fn github_add_comment(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
    body: String,
) -> Result<CommentResult, String> {
    let token = cache.require_token()?;
    comments::add_comment(&client, &token, &owner, &repo, number, &body).await
}

#[tauri::command]
pub async fn github_edit_comment(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    comment_id: i64,
    body: String,
) -> Result<(), String> {
    let token = cache.require_token()?;
    comments::edit_comment(&client, &token, &owner, &repo, comment_id, &body).await
}

#[tauri::command]
pub async fn github_delete_comment(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    comment_id: i64,
) -> Result<(), String> {
    let token = cache.require_token()?;
    comments::delete_comment(&client, &token, &owner, &repo, comment_id).await
}

#[tauri::command]
pub async fn github_merge_pr(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
    method: String,
    title: Option<String>,
    message: Option<String>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    pr_actions::merge_pr(
        &client,
        &token,
        &owner,
        &repo,
        number,
        &method,
        title.as_deref(),
        message.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn github_close_pr(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<(), String> {
    let token = cache.require_token()?;
    pr_actions::close_pr(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_reopen_pr(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<(), String> {
    let token = cache.require_token()?;
    pr_actions::reopen_pr(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_create_pr(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    title: String,
    body: String,
    head: String,
    base: String,
    draft: bool,
) -> Result<crate::github::mutations::pr_actions::CreatePrResult, String> {
    let token = cache.require_token()?;
    crate::github::mutations::pr_actions::create_pr(
        &client, &token, &owner, &repo, &title, &body, &head, &base, draft,
    )
    .await
}

#[tauri::command]
pub async fn github_mark_pr_ready(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<(), String> {
    let token = cache.require_token()?;
    let detail = pr_detail::get_pr_detail(&client, &token, &owner, &repo, number).await?;
    pr_actions::mark_ready_for_review(&client, &token, &detail.id).await
}

#[tauri::command]
pub async fn github_convert_pr_to_draft(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<(), String> {
    let token = cache.require_token()?;
    let detail = pr_detail::get_pr_detail(&client, &token, &owner, &repo, number).await?;
    pr_actions::convert_to_draft(&client, &token, &detail.id).await
}

#[tauri::command]
pub async fn github_close_issue(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<(), String> {
    let token = cache.require_token()?;
    issue_actions::close_issue(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_reopen_issue(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<(), String> {
    let token = cache.require_token()?;
    issue_actions::reopen_issue(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_update_issue(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
    title: Option<String>,
    body: Option<String>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    issue_actions::update_issue(
        &client,
        &token,
        &owner,
        &repo,
        number,
        title.as_deref(),
        body.as_deref(),
    )
    .await
}

#[tauri::command]
pub async fn github_lock_issue(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
    lock_reason: Option<String>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    issue_actions::lock_issue(&client, &token, &owner, &repo, number, lock_reason.as_deref()).await
}

#[tauri::command]
pub async fn github_unlock_issue(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
) -> Result<(), String> {
    let token = cache.require_token()?;
    issue_actions::unlock_issue(&client, &token, &owner, &repo, number).await
}

#[tauri::command]
pub async fn github_set_issue_labels(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
    labels: Vec<String>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    issue_actions::set_issue_labels(&client, &token, &owner, &repo, number, &labels).await
}

#[tauri::command]
pub async fn github_set_issue_assignees(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    number: i32,
    assignees: Vec<String>,
) -> Result<(), String> {
    let token = cache.require_token()?;
    issue_actions::set_issue_assignees(&client, &token, &owner, &repo, number, &assignees).await
}

#[tauri::command]
pub async fn github_create_issue(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
    title: String,
    body: String,
    labels: Vec<String>,
    assignees: Vec<String>,
) -> Result<issue_actions::CreateIssueResult, String> {
    let token = cache.require_token()?;
    issue_actions::create_issue(&client, &token, &owner, &repo, &title, &body, &labels, &assignees)
        .await
}

#[tauri::command]
pub async fn github_list_repo_labels(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
) -> Result<Vec<issue_actions::RepoLabel>, String> {
    let token = cache.require_token()?;
    issue_actions::list_repo_labels(&client, &token, &owner, &repo).await
}

#[tauri::command]
pub async fn github_list_repo_assignees(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    owner: String,
    repo: String,
) -> Result<Vec<String>, String> {
    let token = cache.require_token()?;
    issue_actions::list_repo_assignees(&client, &token, &owner, &repo).await
}
