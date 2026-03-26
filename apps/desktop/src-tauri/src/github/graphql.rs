use reqwest::Client;
use serde_json::Value;

const GRAPHQL_URL: &str = "https://api.github.com/graphql";

pub async fn execute_graphql(
    client: &Client,
    token: &str,
    query: &str,
    variables: Value,
) -> Result<Value, String> {
    let body = serde_json::json!({
        "query": query,
        "variables": variables,
    });

    let resp = client
        .post(GRAPHQL_URL)
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to execute GraphQL query: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub GraphQL API error {status}: {body}"));
    }

    let json: Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse GraphQL response: {e}"))?;

    if let Some(errors) = json.get("errors") {
        return Err(format!("GraphQL errors: {errors}"));
    }

    json.get("data")
        .cloned()
        .ok_or_else(|| "GraphQL response missing 'data' field".to_string())
}
