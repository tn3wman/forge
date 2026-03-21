use std::collections::HashMap;

use serde_json::Value;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

use crate::lsp::client::LspClient;
use crate::lsp::types::*;

pub struct LspManager {
    clients: Mutex<HashMap<(String, String), LspClient>>,
}

impl LspManager {
    pub fn new() -> Self {
        Self {
            clients: Mutex::new(HashMap::new()),
        }
    }

    pub async fn start_server(
        &self,
        bay_id: &str,
        language_id: &str,
        root_path: &str,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let key = (bay_id.to_string(), language_id.to_string());

        {
            let clients = self.clients.lock().await;
            if clients.contains_key(&key) {
                return Ok(()); // Already running
            }
        }

        let (cmd, args) = resolve_server_command(language_id)?;
        let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        let client = LspClient::spawn(&cmd, &args_refs, root_path).await?;

        // Take the notification receiver and spawn a forwarding task
        let notification_rx = {
            let mut rx_guard = client.notification_rx.lock().await;
            rx_guard.take()
        };

        if let Some(mut rx) = notification_rx {
            let bay_id_owned = bay_id.to_string();
            let language_id_owned = language_id.to_string();
            tokio::spawn(async move {
                while let Some((method, params)) = rx.recv().await {
                    if method == "textDocument/publishDiagnostics" {
                        let uri = params
                            .get("uri")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let diagnostics = parse_diagnostics(&uri, &params);
                        let event = LspDiagnosticsEvent {
                            bay_id: bay_id_owned.clone(),
                            language_id: language_id_owned.clone(),
                            uri,
                            diagnostics,
                        };
                        let _ = app_handle.emit("lsp:diagnostics", &event);
                    }
                }
            });
        }

        let mut clients = self.clients.lock().await;
        clients.insert(key, client);
        Ok(())
    }

    pub async fn stop_server(&self, bay_id: &str, language_id: &str) -> Result<(), String> {
        let key = (bay_id.to_string(), language_id.to_string());
        let mut clients = self.clients.lock().await;
        if let Some(client) = clients.remove(&key) {
            client.shutdown().await?;
        }
        Ok(())
    }

    pub async fn stop_all(&self, bay_id: &str) -> Result<(), String> {
        let mut clients = self.clients.lock().await;
        let keys: Vec<(String, String)> = clients
            .keys()
            .filter(|(b, _)| b == bay_id)
            .cloned()
            .collect();
        for key in keys {
            if let Some(client) = clients.remove(&key) {
                let _ = client.shutdown().await;
            }
        }
        Ok(())
    }

    fn err_no_server(bay_id: &str, language_id: &str) -> String {
        format!(
            "No LSP server running for bay={}, lang={}",
            bay_id, language_id
        )
    }

    pub async fn did_open(
        &self,
        bay_id: &str,
        language_id: &str,
        uri: &str,
        text: &str,
    ) -> Result<(), String> {
        let clients = self.clients.lock().await;
        let key = (bay_id.to_string(), language_id.to_string());
        let client = clients
            .get(&key)
            .ok_or_else(|| Self::err_no_server(bay_id, language_id))?;
        client.did_open(uri, language_id, text).await
    }

    pub async fn did_change(
        &self,
        bay_id: &str,
        language_id: &str,
        uri: &str,
        version: i32,
        text: &str,
    ) -> Result<(), String> {
        let clients = self.clients.lock().await;
        let key = (bay_id.to_string(), language_id.to_string());
        let client = clients
            .get(&key)
            .ok_or_else(|| Self::err_no_server(bay_id, language_id))?;
        client.did_change(uri, version, text).await
    }

    pub async fn completion(
        &self,
        bay_id: &str,
        language_id: &str,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Vec<LspCompletionItem>, String> {
        let clients = self.clients.lock().await;
        let key = (bay_id.to_string(), language_id.to_string());
        let client = clients
            .get(&key)
            .ok_or_else(|| Self::err_no_server(bay_id, language_id))?;
        client.completion(uri, line, character).await
    }

    pub async fn hover(
        &self,
        bay_id: &str,
        language_id: &str,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Option<LspHoverResult>, String> {
        let clients = self.clients.lock().await;
        let key = (bay_id.to_string(), language_id.to_string());
        let client = clients
            .get(&key)
            .ok_or_else(|| Self::err_no_server(bay_id, language_id))?;
        client.hover(uri, line, character).await
    }

    pub async fn definition(
        &self,
        bay_id: &str,
        language_id: &str,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Option<Vec<LspLocation>>, String> {
        let clients = self.clients.lock().await;
        let key = (bay_id.to_string(), language_id.to_string());
        let client = clients
            .get(&key)
            .ok_or_else(|| Self::err_no_server(bay_id, language_id))?;
        client.definition(uri, line, character).await
    }

    pub async fn document_symbol(
        &self,
        bay_id: &str,
        language_id: &str,
        uri: &str,
    ) -> Result<Vec<LspSymbol>, String> {
        let clients = self.clients.lock().await;
        let key = (bay_id.to_string(), language_id.to_string());
        let client = clients
            .get(&key)
            .ok_or_else(|| Self::err_no_server(bay_id, language_id))?;
        client.document_symbol(uri).await
    }

    pub async fn workspace_symbol(
        &self,
        bay_id: &str,
        language_id: &str,
        query: &str,
    ) -> Result<Vec<LspSymbol>, String> {
        let clients = self.clients.lock().await;
        let key = (bay_id.to_string(), language_id.to_string());
        let client = clients
            .get(&key)
            .ok_or_else(|| Self::err_no_server(bay_id, language_id))?;
        client.workspace_symbol(query).await
    }
}

fn resolve_server_command(language_id: &str) -> Result<(String, Vec<String>), String> {
    match language_id {
        "typescript" | "javascript" | "typescriptreact" | "javascriptreact" => Ok((
            "typescript-language-server".to_string(),
            vec!["--stdio".to_string()],
        )),
        "rust" => Ok(("rust-analyzer".to_string(), vec![])),
        other => Err(format!("Unsupported language: {}", other)),
    }
}

fn parse_diagnostics(uri: &str, params: &Value) -> Vec<LspDiagnostic> {
    params
        .get("diagnostics")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|d| {
                    let range = d.get("range")?;
                    Some(LspDiagnostic {
                        uri: uri.to_string(),
                        range: LspRange {
                            start: LspPosition {
                                line: range.get("start")?.get("line")?.as_u64()? as u32,
                                character: range.get("start")?.get("character")?.as_u64()? as u32,
                            },
                            end: LspPosition {
                                line: range.get("end")?.get("line")?.as_u64()? as u32,
                                character: range.get("end")?.get("character")?.as_u64()? as u32,
                            },
                        },
                        severity: d
                            .get("severity")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(1) as u8,
                        message: d.get("message")?.as_str()?.to_string(),
                        source: d
                            .get("source")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}
