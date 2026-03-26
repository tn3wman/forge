use crate::models::agent::{
    AgentEvent, AgentEventPayload, AgentExitPayload, AgentMode, ContentBlock,
};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

use super::backend::AgentBackend;

pub struct ClaudeBackend {
    child: Child,
    stdin: Option<ChildStdin>,
    killed: Arc<AtomicBool>,
    conversation_id: Arc<Mutex<Option<String>>>,
}

impl ClaudeBackend {
    pub fn spawn(
        session_id: String,
        mode: &AgentMode,
        working_directory: Option<&str>,
        initial_prompt: &str,
        app_handle: AppHandle,
    ) -> Result<Self, String> {
        let cli_path =
            which::which("claude").map_err(|e| format!("CLI 'claude' not found: {e}"))?;

        let permission_mode = match mode {
            AgentMode::Default => "default",
            AgentMode::Plan => "plan",
            AgentMode::AcceptEdits => "acceptEdits",
            AgentMode::BypassPermissions => "bypassPermissions",
            AgentMode::DontAsk => "dontAsk",
            AgentMode::Auto => "auto",
        };

        let mut cmd = Command::new(&cli_path);
        cmd.arg("-p")
            .arg("--output-format")
            .arg("stream-json")
            .arg("--verbose")
            .arg("--include-partial-messages")
            .arg("--permission-mode")
            .arg(permission_mode)
            .arg(initial_prompt)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(dir) = working_directory {
            cmd.current_dir(dir);
        }

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn claude: {e}"))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture stdout".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "Failed to capture stderr".to_string())?;
        let stdin = child.stdin.take();

        let killed = Arc::new(AtomicBool::new(false));
        let conversation_id: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));

        // Stdout reader thread
        {
            let killed = killed.clone();
            let conversation_id = conversation_id.clone();
            let session_id = session_id.clone();
            let app_handle = app_handle.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if killed.load(Ordering::Relaxed) {
                        break;
                    }
                    let line = match line {
                        Ok(l) => l,
                        Err(_) => break,
                    };
                    if line.trim().is_empty() {
                        continue;
                    }
                    let json: serde_json::Value = match serde_json::from_str(&line) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    let event = parse_agent_event(&json, &conversation_id);

                    let _ = app_handle.emit(
                        "agent-event",
                        AgentEventPayload {
                            session_id: session_id.clone(),
                            event,
                        },
                    );
                }

                // EOF or error — emit exit
                let _ = app_handle.emit(
                    "agent-exit",
                    AgentExitPayload {
                        session_id,
                        exit_code: None,
                    },
                );
            });
        }

        // Stderr reader thread
        {
            let killed = killed.clone();
            let session_id = session_id.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if killed.load(Ordering::Relaxed) {
                        break;
                    }
                    let line = match line {
                        Ok(l) => l,
                        Err(_) => break,
                    };
                    // Only emit error events for lines containing "Error" or "error"
                    if line.contains("Error") || line.contains("error") {
                        let _ = app_handle.emit(
                            "agent-event",
                            AgentEventPayload {
                                session_id: session_id.clone(),
                                event: AgentEvent::Raw {
                                    data: serde_json::json!({
                                        "type": "stderr",
                                        "message": line,
                                    }),
                                },
                            },
                        );
                    }
                }
            });
        }

        Ok(Self {
            child,
            stdin,
            killed,
            conversation_id,
        })
    }
}

fn parse_agent_event(
    json: &serde_json::Value,
    conversation_id: &Arc<Mutex<Option<String>>>,
) -> AgentEvent {
    let event_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("");

    match event_type {
        "system" => {
            let session_id = json
                .get("session_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            // Store the session/conversation id
            if let Ok(mut cid) = conversation_id.lock() {
                *cid = Some(session_id.clone());
            }

            let model = json.get("model").and_then(|v| v.as_str()).map(String::from);
            let permission_mode = json
                .get("permissionMode")
                .and_then(|v| v.as_str())
                .map(String::from);
            let tools = json.get("tools").and_then(|v| {
                v.as_array().map(|arr| {
                    arr.iter()
                        .filter_map(|t| t.as_str().map(String::from))
                        .collect()
                })
            });

            AgentEvent::SystemInit {
                session_id,
                model,
                permission_mode,
                tools,
            }
        }
        "assistant" => {
            let message = json.get("message").unwrap_or(json);
            let message_id = message
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let content = message
                .get("content")
                .and_then(|v| v.as_array())
                .map(|blocks| {
                    blocks
                        .iter()
                        .filter_map(|block| {
                            let block_type = block.get("type")?.as_str()?;
                            match block_type {
                                "text" => {
                                    let text = block
                                        .get("text")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    Some(ContentBlock::Text { text })
                                }
                                "tool_use" => {
                                    let id = block
                                        .get("id")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let name = block
                                        .get("name")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let input = block
                                        .get("input")
                                        .cloned()
                                        .unwrap_or(serde_json::Value::Null);
                                    Some(ContentBlock::ToolUse { id, name, input })
                                }
                                _ => None,
                            }
                        })
                        .collect()
                })
                .unwrap_or_default();

            AgentEvent::AssistantMessage {
                message_id,
                content,
            }
        }
        "result" => {
            let result_text = json
                .get("result")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let duration_ms = json
                .get("duration_ms")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let total_cost_usd = json
                .get("total_cost_usd")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let is_error = json
                .get("is_error")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            AgentEvent::Result {
                result_text,
                duration_ms,
                total_cost_usd,
                is_error,
            }
        }
        _ => AgentEvent::Raw {
            data: json.clone(),
        },
    }
}

impl AgentBackend for ClaudeBackend {
    fn send_message(&mut self, message: &str) -> Result<(), String> {
        let stdin = self
            .stdin
            .as_mut()
            .ok_or_else(|| "stdin not available".to_string())?;
        stdin
            .write_all(message.as_bytes())
            .map_err(|e| format!("Failed to write to stdin: {e}"))?;
        stdin
            .write_all(b"\n")
            .map_err(|e| format!("Failed to write newline to stdin: {e}"))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush stdin: {e}"))?;
        Ok(())
    }

    fn respond_permission(&mut self, _tool_use_id: &str, allow: bool) -> Result<(), String> {
        let response = if allow { "y\n" } else { "n\n" };
        let stdin = self
            .stdin
            .as_mut()
            .ok_or_else(|| "stdin not available".to_string())?;
        stdin
            .write_all(response.as_bytes())
            .map_err(|e| format!("Failed to write permission response: {e}"))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush stdin: {e}"))?;
        Ok(())
    }

    fn abort(&mut self) -> Result<(), String> {
        #[cfg(unix)]
        {
            let pid = self.child.id() as i32;
            // Send SIGINT for graceful abort
            let ret = unsafe { libc::kill(pid, libc::SIGINT) };
            if ret != 0 {
                return Err(format!(
                    "Failed to send SIGINT: {}",
                    std::io::Error::last_os_error()
                ));
            }
        }
        #[cfg(not(unix))]
        {
            // On non-Unix, fall back to kill
            self.child
                .kill()
                .map_err(|e| format!("Failed to kill process: {e}"))?;
        }
        Ok(())
    }

    fn kill(&mut self) {
        if !self.killed.swap(true, Ordering::Relaxed) {
            let _ = self.child.kill();
        }
    }

    fn is_alive(&mut self) -> bool {
        if self.killed.load(Ordering::Relaxed) {
            return false;
        }
        match self.child.try_wait() {
            Ok(Some(_)) => false,
            _ => true,
        }
    }

    fn conversation_id(&self) -> Option<String> {
        self.conversation_id
            .lock()
            .ok()
            .and_then(|cid| cid.clone())
    }
}

impl Drop for ClaudeBackend {
    fn drop(&mut self) {
        self.kill();
    }
}
