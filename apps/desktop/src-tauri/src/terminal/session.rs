use crate::models::terminal::{AgentMode, TerminalExitPayload, TerminalOutputPayload};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Find the byte index at which to split `data` so the emitted prefix
/// contains only complete UTF-8 sequences. Returns `data.len()` when the
/// last character is complete (the common case for ASCII-heavy terminal
/// output).
fn utf8_safe_split_point(data: &[u8]) -> usize {
    if data.is_empty() {
        return 0;
    }
    // Walk back at most 3 bytes (max UTF-8 continuation run)
    let start = data.len().saturating_sub(3);
    for i in (start..data.len()).rev() {
        let b = data[i];
        if b & 0x80 == 0 {
            // ASCII byte — everything up to and including it is complete
            return data.len();
        }
        if b & 0xC0 != 0x80 {
            // Lead byte — check if enough continuation bytes follow
            let expected = if b & 0xE0 == 0xC0 {
                2
            } else if b & 0xF0 == 0xE0 {
                3
            } else if b & 0xF8 == 0xF0 {
                4
            } else {
                1 // invalid lead, emit anyway
            };
            let available = data.len() - i;
            if available >= expected {
                return data.len(); // complete
            } else {
                return i; // split before incomplete char
            }
        }
    }
    // All continuation bytes with no lead in scan range — emit as-is
    data.len()
}

pub struct PtySession {
    writer: Box<dyn Write + Send>,
    pty: portable_pty::PtyPair,
    killed: Arc<AtomicBool>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    reader: Option<Box<dyn Read + Send>>,
    session_id: String,
}

impl PtySession {
    pub fn spawn(
        session_id: String,
        cli_name: &str,
        mode: &AgentMode,
        working_directory: Option<&str>,
        permission_mode: Option<&str>,
        plan_mode: bool,
        model: Option<&str>,
        _effort: Option<&str>,
        initial_cols: Option<u16>,
        initial_rows: Option<u16>,
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();

        let pty = pty_system
            .openpty(PtySize {
                rows: initial_rows.unwrap_or(24),
                cols: initial_cols.unwrap_or(80),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {e}"))?;

        let is_shell = cli_name == "shell";
        let cli_path = if is_shell {
            // Spawn the user's default login shell
            std::path::PathBuf::from(
                std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into()),
            )
        } else {
            crate::shell_env::which(cli_name)
                .map_err(|_| format!("CLI '{}' not found in PATH", cli_name))?
        };

        let mut cmd = CommandBuilder::new(&cli_path);
        crate::shell_env::apply_env_pty(&mut cmd);

        if is_shell {
            // Launch as interactive login shell
            cmd.arg("-l");
        } else {
            // Determine effective settings from new fields or legacy mode fallback
            let is_full_access = permission_mode == Some("fullAccess")
                || matches!(mode, AgentMode::DangerouslyBypassPermissions);
            let is_plan = plan_mode || matches!(mode, AgentMode::Plan);

            if cli_name == "claude" {
                if is_full_access {
                    cmd.arg("--dangerously-skip-permissions");
                }
                if is_plan {
                    cmd.arg("--plan");
                }
                if let Some(m) = model {
                    cmd.arg("--model");
                    cmd.arg(m);
                }
            } else if cli_name == "codex" {
                if is_full_access {
                    cmd.arg("--full-auto");
                }
                if let Some(m) = model {
                    cmd.arg("--model");
                    cmd.arg(m);
                }
            } else if cli_name == "aider" {
                if let Some(m) = model {
                    cmd.arg("--model");
                    cmd.arg(m);
                }
            }
        }

        if let Some(dir) = working_directory {
            cmd.cwd(dir);
        }

        let child = pty
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn CLI: {e}"))?;

        let writer = pty
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {e}"))?;

        let reader = pty
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

        let killed = Arc::new(AtomicBool::new(false));

        Ok(Self {
            writer,
            pty,
            killed,
            child,
            reader: Some(reader),
            session_id,
        })
    }

    /// Start the PTY reader thread. Call this only after the frontend event
    /// listener is attached so no output events are lost.
    pub fn start_reading(&mut self, app_handle: AppHandle) {
        let mut reader = match self.reader.take() {
            Some(r) => r,
            None => return, // already started
        };

        let killed_clone = self.killed.clone();
        let sid = self.session_id.clone();

        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            let mut pending: Vec<u8> = Vec::new();
            // Initialize to the past so the very first chunk is flushed immediately.
            let mut last_emit = Instant::now() - FLUSH_INTERVAL;
            const FLUSH_INTERVAL: Duration = Duration::from_millis(16);
            const MAX_PENDING: usize = 32768;

            loop {
                if killed_clone.load(Ordering::Relaxed) {
                    break;
                }
                match reader.read(&mut buf) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        pending.extend_from_slice(&buf[..n]);
                        if last_emit.elapsed() >= FLUSH_INTERVAL || pending.len() >= MAX_PENDING {
                            let split = utf8_safe_split_point(&pending);
                            if split > 0 {
                                let remainder = pending[split..].to_vec();
                                pending.truncate(split);
                                let _ = app_handle.emit(
                                    "terminal-output",
                                    TerminalOutputPayload {
                                        session_id: sid.clone(),
                                        data: std::mem::take(&mut pending),
                                    },
                                );
                                pending = remainder;
                            }
                            last_emit = Instant::now();
                        }
                    }
                    Err(_) => break,
                }
            }

            // Flush any remaining buffered output
            if !pending.is_empty() {
                let _ = app_handle.emit(
                    "terminal-output",
                    TerminalOutputPayload {
                        session_id: sid.clone(),
                        data: pending,
                    },
                );
            }

            // Emit exit event
            let _ = app_handle.emit(
                "terminal-exit",
                TerminalExitPayload {
                    session_id: sid,
                    exit_code: None,
                },
            );
        });
    }

    pub fn write(&mut self, data: &[u8]) -> Result<(), String> {
        self.writer
            .write_all(data)
            .map_err(|e| format!("Failed to write to PTY: {e}"))?;
        self.writer
            .flush()
            .map_err(|e| format!("Failed to flush PTY: {e}"))?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        self.pty
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {e}"))
    }

    pub fn kill(&mut self) {
        if !self.killed.swap(true, Ordering::Relaxed) {
            let _ = self.child.kill();
        }
    }

    pub fn is_alive(&mut self) -> bool {
        if self.killed.load(Ordering::Relaxed) {
            return false;
        }
        // try_wait returns Ok(Some(status)) if exited, Ok(None) if still running
        match self.child.try_wait() {
            Ok(Some(_)) => false,
            _ => true,
        }
    }
}

impl Drop for PtySession {
    fn drop(&mut self) {
        self.kill();
    }
}
