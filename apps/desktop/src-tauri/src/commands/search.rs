use crate::github::search;
use crate::keychain::TokenCache;

#[tauri::command]
pub async fn github_search(
    client: tauri::State<'_, reqwest::Client>,
    cache: tauri::State<'_, TokenCache>,
    query: String,
    repos: Vec<(String, String)>,
) -> Result<Vec<search::SearchResultItem>, String> {
    let token = cache.require_token()?;
    search::search_issues_and_prs(&client, &token, &query, &repos).await
}
