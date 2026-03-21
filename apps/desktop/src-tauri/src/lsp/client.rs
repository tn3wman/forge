use std::collections::HashMap;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;

use serde_json::{json, Value};
use tokio::process::Command;
use tokio::sync::{mpsc, oneshot, Mutex};

use crate::lsp::transport::LspTransport;
use crate::lsp::types::*;

pub struct LspClient {
    transport: Arc<Mutex<LspTransport>>,
    next_id: AtomicI64,
    pending: Arc<Mutex<HashMap<i64, oneshot::Sender<Value>>>>,
    pub notification_rx: Mutex<Option<mpsc::UnboundedReceiver<(String, Value)>>>,
    _child: tokio::process::Child,
}

impl LspClient {
    pub async fn spawn(cmd: &str, args: &[&str], root_path: &str) -> Result<Self, String> {
        let mut child = Command::new(cmd)
            .args(args)
            .current_dir(root_path)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to spawn {}: {}", cmd, e))?;

        let stdin = child.stdin.take().ok_or("Failed to open stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to open stdout")?;

        let transport = Arc::new(Mutex::new(LspTransport::new(stdin, stdout)));
        let pending: Arc<Mutex<HashMap<i64, oneshot::Sender<Value>>>> =
            Arc::new(Mutex::new(HashMap::new()));
        let (notification_tx, notification_rx) = mpsc::unbounded_channel();

        // Spawn the reader task
        let reader_transport = Arc::clone(&transport);
        let reader_pending = Arc::clone(&pending);
        tokio::spawn(async move {
            loop {
                let msg = {
                    let mut t = reader_transport.lock().await;
                    match t.receive().await {
                        Ok(msg) => msg,
                        Err(_) => break, // Server closed or error
                    }
                };

                let parsed: Value = match serde_json::from_str(&msg) {
                    Ok(v) => v,
                    Err(_) => continue,
                };

                if let Some(id) = parsed.get("id").and_then(|v| v.as_i64()) {
                    // Response to a request
                    let mut p = reader_pending.lock().await;
                    if let Some(sender) = p.remove(&id) {
                        let _ = sender.send(parsed);
                    }
                } else if let Some(method) = parsed.get("method").and_then(|v| v.as_str()) {
                    // Notification from server
                    let params = parsed.get("params").cloned().unwrap_or(Value::Null);
                    let _ = notification_tx.send((method.to_string(), params));
                }
            }
        });

        let client = Self {
            transport,
            next_id: AtomicI64::new(1),
            pending,
            notification_rx: Mutex::new(Some(notification_rx)),
            _child: child,
        };

        // Perform initialize handshake
        let root_uri = format!("file://{}", root_path);
        let init_params = json!({
            "processId": null,
            "rootUri": root_uri,
            "capabilities": {
                "textDocument": {
                    "completion": { "completionItem": {} },
                    "hover": {},
                    "definition": {},
                    "documentSymbol": {},
                    "publishDiagnostics": {}
                },
                "workspace": {
                    "symbol": {}
                }
            }
        });

        client.send_request("initialize", init_params).await?;
        client
            .send_notification("initialized", json!({}))
            .await?;

        Ok(client)
    }

    pub async fn send_request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let message = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        });

        let (tx, rx) = oneshot::channel();
        {
            let mut p = self.pending.lock().await;
            p.insert(id, tx);
        }

        {
            let mut t = self.transport.lock().await;
            t.send(&message.to_string()).await?;
        }

        let response = rx
            .await
            .map_err(|_| "Response channel closed".to_string())?;

        if let Some(error) = response.get("error") {
            return Err(format!("LSP error: {}", error));
        }

        Ok(response.get("result").cloned().unwrap_or(Value::Null))
    }

    pub async fn send_notification(&self, method: &str, params: Value) -> Result<(), String> {
        let message = json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        });

        let mut t = self.transport.lock().await;
        t.send(&message.to_string()).await
    }

    pub async fn did_open(&self, uri: &str, language_id: &str, text: &str) -> Result<(), String> {
        self.send_notification(
            "textDocument/didOpen",
            json!({
                "textDocument": {
                    "uri": uri,
                    "languageId": language_id,
                    "version": 1,
                    "text": text,
                }
            }),
        )
        .await
    }

    pub async fn did_change(
        &self,
        uri: &str,
        version: i32,
        text: &str,
    ) -> Result<(), String> {
        self.send_notification(
            "textDocument/didChange",
            json!({
                "textDocument": {
                    "uri": uri,
                    "version": version,
                },
                "contentChanges": [{ "text": text }]
            }),
        )
        .await
    }

    pub async fn completion(
        &self,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Vec<LspCompletionItem>, String> {
        let result = self
            .send_request(
                "textDocument/completion",
                json!({
                    "textDocument": { "uri": uri },
                    "position": { "line": line, "character": character },
                }),
            )
            .await?;

        // Handle both CompletionList and CompletionItem[] responses
        let items = if let Some(items) = result.get("items") {
            items.clone()
        } else if result.is_array() {
            result
        } else {
            return Ok(vec![]);
        };

        let items: Vec<Value> = serde_json::from_value(items).unwrap_or_default();
        Ok(items
            .into_iter()
            .map(|item| LspCompletionItem {
                label: item
                    .get("label")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                kind: item.get("kind").and_then(|v| v.as_u64()).map(|v| v as u32),
                detail: item
                    .get("detail")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                insert_text: item
                    .get("insertText")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                sort_text: item
                    .get("sortText")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            })
            .collect())
    }

    pub async fn hover(
        &self,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Option<LspHoverResult>, String> {
        let result = self
            .send_request(
                "textDocument/hover",
                json!({
                    "textDocument": { "uri": uri },
                    "position": { "line": line, "character": character },
                }),
            )
            .await?;

        if result.is_null() {
            return Ok(None);
        }

        let contents = match result.get("contents") {
            Some(Value::String(s)) => s.clone(),
            Some(Value::Object(obj)) => obj
                .get("value")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            Some(Value::Array(arr)) => arr
                .iter()
                .filter_map(|v| match v {
                    Value::String(s) => Some(s.clone()),
                    Value::Object(o) => o.get("value").and_then(|v| v.as_str()).map(String::from),
                    _ => None,
                })
                .collect::<Vec<_>>()
                .join("\n"),
            _ => return Ok(None),
        };

        let range = result.get("range").and_then(|r| {
            Some(LspRange {
                start: LspPosition {
                    line: r.get("start")?.get("line")?.as_u64()? as u32,
                    character: r.get("start")?.get("character")?.as_u64()? as u32,
                },
                end: LspPosition {
                    line: r.get("end")?.get("line")?.as_u64()? as u32,
                    character: r.get("end")?.get("character")?.as_u64()? as u32,
                },
            })
        });

        Ok(Some(LspHoverResult { contents, range }))
    }

    pub async fn definition(
        &self,
        uri: &str,
        line: u32,
        character: u32,
    ) -> Result<Option<Vec<LspLocation>>, String> {
        let result = self
            .send_request(
                "textDocument/definition",
                json!({
                    "textDocument": { "uri": uri },
                    "position": { "line": line, "character": character },
                }),
            )
            .await?;

        if result.is_null() {
            return Ok(None);
        }

        let locations = if result.is_array() {
            result
        } else if result.is_object() {
            Value::Array(vec![result])
        } else {
            return Ok(None);
        };

        let locs: Vec<LspLocation> = locations
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|loc| {
                Some(LspLocation {
                    uri: loc.get("uri")?.as_str()?.to_string(),
                    range: LspRange {
                        start: LspPosition {
                            line: loc.get("range")?.get("start")?.get("line")?.as_u64()? as u32,
                            character: loc
                                .get("range")?
                                .get("start")?
                                .get("character")?
                                .as_u64()? as u32,
                        },
                        end: LspPosition {
                            line: loc.get("range")?.get("end")?.get("line")?.as_u64()? as u32,
                            character: loc
                                .get("range")?
                                .get("end")?
                                .get("character")?
                                .as_u64()? as u32,
                        },
                    },
                })
            })
            .collect();

        if locs.is_empty() {
            Ok(None)
        } else {
            Ok(Some(locs))
        }
    }

    pub async fn document_symbol(&self, uri: &str) -> Result<Vec<LspSymbol>, String> {
        let result = self
            .send_request(
                "textDocument/documentSymbol",
                json!({
                    "textDocument": { "uri": uri },
                }),
            )
            .await?;

        if result.is_null() || !result.is_array() {
            return Ok(vec![]);
        }

        Ok(parse_symbols_from_value(&result, uri))
    }

    pub async fn workspace_symbol(&self, query: &str) -> Result<Vec<LspSymbol>, String> {
        let result = self
            .send_request(
                "workspace/symbol",
                json!({ "query": query }),
            )
            .await?;

        if result.is_null() || !result.is_array() {
            return Ok(vec![]);
        }

        // Workspace symbols always have location
        let symbols: Vec<LspSymbol> = result
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|sym| {
                let loc = sym.get("location")?;
                Some(LspSymbol {
                    name: sym.get("name")?.as_str()?.to_string(),
                    kind: sym.get("kind")?.as_u64()? as u32,
                    location: LspLocation {
                        uri: loc.get("uri")?.as_str()?.to_string(),
                        range: parse_range(loc.get("range")?)?,
                    },
                    container_name: sym
                        .get("containerName")
                        .and_then(|v| v.as_str())
                        .map(String::from),
                })
            })
            .collect();

        Ok(symbols)
    }

    pub async fn shutdown(&self) -> Result<(), String> {
        self.send_request("shutdown", Value::Null).await?;
        self.send_notification("exit", Value::Null).await?;
        Ok(())
    }
}

fn parse_range(range: &Value) -> Option<LspRange> {
    Some(LspRange {
        start: LspPosition {
            line: range.get("start")?.get("line")?.as_u64()? as u32,
            character: range.get("start")?.get("character")?.as_u64()? as u32,
        },
        end: LspPosition {
            line: range.get("end")?.get("line")?.as_u64()? as u32,
            character: range.get("end")?.get("character")?.as_u64()? as u32,
        },
    })
}

/// Parse symbols from document symbol response. Handles both SymbolInformation[]
/// and DocumentSymbol[] (the latter has children and selectionRange instead of location).
fn parse_symbols_from_value(value: &Value, doc_uri: &str) -> Vec<LspSymbol> {
    let mut symbols = Vec::new();
    if let Some(arr) = value.as_array() {
        for sym in arr {
            // DocumentSymbol format (has selectionRange, no location)
            if let Some(selection_range) = sym.get("selectionRange") {
                if let (Some(name), Some(kind)) = (
                    sym.get("name").and_then(|v| v.as_str()),
                    sym.get("kind").and_then(|v| v.as_u64()),
                ) {
                    if let Some(range) = parse_range(selection_range) {
                        symbols.push(LspSymbol {
                            name: name.to_string(),
                            kind: kind as u32,
                            location: LspLocation {
                                uri: doc_uri.to_string(),
                                range,
                            },
                            container_name: None,
                        });
                    }
                }
                // Recurse into children
                if let Some(children) = sym.get("children") {
                    symbols.extend(parse_symbols_from_value(children, doc_uri));
                }
            }
            // SymbolInformation format (has location)
            else if let Some(loc) = sym.get("location") {
                if let (Some(name), Some(kind)) = (
                    sym.get("name").and_then(|v| v.as_str()),
                    sym.get("kind").and_then(|v| v.as_u64()),
                ) {
                    if let (Some(uri), Some(range)) = (
                        loc.get("uri").and_then(|v| v.as_str()),
                        loc.get("range").and_then(parse_range),
                    ) {
                        symbols.push(LspSymbol {
                            name: name.to_string(),
                            kind: kind as u32,
                            location: LspLocation {
                                uri: uri.to_string(),
                                range,
                            },
                            container_name: sym
                                .get("containerName")
                                .and_then(|v| v.as_str())
                                .map(String::from),
                        });
                    }
                }
            }
        }
    }
    symbols
}
