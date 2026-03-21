use tauri::State;

use crate::lsp::manager::LspManager;
use crate::lsp::types::*;

#[tauri::command]
pub async fn lsp_start(
    bay_id: String,
    language_id: String,
    root_path: String,
    app: tauri::AppHandle,
    state: State<'_, LspManager>,
) -> Result<(), String> {
    state
        .start_server(&bay_id, &language_id, &root_path, app)
        .await
}

#[tauri::command]
pub async fn lsp_stop(
    bay_id: String,
    language_id: String,
    state: State<'_, LspManager>,
) -> Result<(), String> {
    state.stop_server(&bay_id, &language_id).await
}

#[tauri::command]
pub async fn lsp_stop_all(
    bay_id: String,
    state: State<'_, LspManager>,
) -> Result<(), String> {
    state.stop_all(&bay_id).await
}

#[tauri::command]
pub async fn lsp_did_open(
    bay_id: String,
    language_id: String,
    uri: String,
    text: String,
    state: State<'_, LspManager>,
) -> Result<(), String> {
    state
        .did_open(&bay_id, &language_id, &uri, &text)
        .await
}

#[tauri::command]
pub async fn lsp_did_change(
    bay_id: String,
    language_id: String,
    uri: String,
    version: i32,
    text: String,
    state: State<'_, LspManager>,
) -> Result<(), String> {
    state
        .did_change(&bay_id, &language_id, &uri, version, &text)
        .await
}

#[tauri::command]
pub async fn lsp_completion(
    bay_id: String,
    language_id: String,
    uri: String,
    line: u32,
    character: u32,
    state: State<'_, LspManager>,
) -> Result<Vec<LspCompletionItem>, String> {
    state
        .completion(&bay_id, &language_id, &uri, line, character)
        .await
}

#[tauri::command]
pub async fn lsp_hover(
    bay_id: String,
    language_id: String,
    uri: String,
    line: u32,
    character: u32,
    state: State<'_, LspManager>,
) -> Result<Option<LspHoverResult>, String> {
    state
        .hover(&bay_id, &language_id, &uri, line, character)
        .await
}

#[tauri::command]
pub async fn lsp_definition(
    bay_id: String,
    language_id: String,
    uri: String,
    line: u32,
    character: u32,
    state: State<'_, LspManager>,
) -> Result<Option<Vec<LspLocation>>, String> {
    state
        .definition(&bay_id, &language_id, &uri, line, character)
        .await
}

#[tauri::command]
pub async fn lsp_document_symbols(
    bay_id: String,
    language_id: String,
    uri: String,
    state: State<'_, LspManager>,
) -> Result<Vec<LspSymbol>, String> {
    state
        .document_symbol(&bay_id, &language_id, &uri)
        .await
}

#[tauri::command]
pub async fn lsp_workspace_symbols(
    bay_id: String,
    language_id: String,
    query: String,
    state: State<'_, LspManager>,
) -> Result<Vec<LspSymbol>, String> {
    state
        .workspace_symbol(&bay_id, &language_id, &query)
        .await
}
