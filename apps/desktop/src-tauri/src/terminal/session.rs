use crate::models::terminal::{AgentMode, TerminalExitPayload, TerminalOutputPayload};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    writer: Box<dyn Write + Send>,
    pty: portable_pty::PtyPair,
    killed: Arc<AtomicBool>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

impl PtySession {
    pub fn spawn(
        session_id: String,
        cli_name: &str,
        mode: &AgentMode,
        working_directory: Option<&str>,
        app_handle: AppHandle,
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();

        let pty = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {e}"))?;

        let cli_path = crate::shell_env::which(cli_name)
            .map_err(|_| format!("CLI '{}' not found in PATH", cli_name))?;

        let mut cmd = CommandBuilder::new(&cli_path);
        crate::shell_env::apply_env_pty(&mut cmd);

        // Add mode-specific flags
        match mode {
            AgentMode::Plan => {
                if cli_name == "claude" {
                    cmd.arg("--plan");
                }
            }
            AgentMode::DangerouslyBypassPermissions => {
                if cli_name == "claude" {
                    cmd.arg("--dangerously-skip-permissions");
                }
            }
            AgentMode::Normal => {}
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

        let mut reader = pty
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

        let killed = Arc::new(AtomicBool::new(false));
        let killed_clone = killed.clone();
        let sid = session_id.clone();

        // Spawn a native thread for blocking PTY reads
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                if killed_clone.load(Ordering::Relaxed) {
                    break;
                }
                match reader.read(&mut buf) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let _ = app_handle.emit(
                            "terminal-output",
                            TerminalOutputPayload {
                                session_id: sid.clone(),
                                data: buf[..n].to_vec(),
                            },
                        );
                    }
                    Err(_) => break,
                }
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

        Ok(Self {
            writer,
            pty,
            killed,
            child,
        })
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
