use crate::github::search;

#[tauri::command]
pub async fn github_search(
    client: tauri::State<'_, reqwest::Client>,
    token: String,
    query: String,
    repos: Vec<(String, String)>,
) -> Result<Vec<search::SearchResultItem>, String> {
    search::search_issues_and_prs(&client, &token, &query, &repos).await
}
