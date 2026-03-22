use serde::{Deserialize, Serialize};
use std::process::Command;
use crate::models::agent_cli::{CliType, DetectedCli};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnAgentConfig {
    pub bay_id: String,
    pub lane_id: String,
    pub cli_type: CliType,
    pub prompt: String,
    pub cwd: String,
    pub model: Option<String>,
    pub system_prompt: Option<String>,
    pub allowed_tools: Vec<String>,
    pub session_id: Option<String>,
}

fn build_claude_code_command(config: &SpawnAgentConfig, executable: &str) -> Command {
    let mut cmd = Command::new(executable);
    cmd.arg("-p");
    cmd.arg("--output-format=stream-json");

    if let Some(ref session_id) = config.session_id {
        cmd.arg(format!("--session-id={session_id}"));
    }
    if let Some(ref model) = config.model {
        cmd.arg(format!("--model={model}"));
    }
    if let Some(ref system_prompt) = config.system_prompt {
        cmd.arg(format!("--system-prompt={system_prompt}"));
    }
    if !config.allowed_tools.is_empty() {
        let tools = config.allowed_tools.join(",");
        cmd.arg(format!("--allowedTools={tools}"));
    }

    cmd.arg(&config.prompt);
    cmd.current_dir(&config.cwd);
    cmd
}

fn build_codex_command(config: &SpawnAgentConfig, executable: &str) -> Command {
    let mut cmd = Command::new(executable);
    cmd.arg("cloud");
    cmd.arg("exec");

    if let Some(ref model) = config.model {
        cmd.arg(format!("--model={model}"));
    }

    cmd.arg(&config.prompt);
    cmd.current_dir(&config.cwd);
    cmd
}

pub fn build_command(config: &SpawnAgentConfig, executable: &str) -> Command {
    match config.cli_type {
        CliType::ClaudeCode => build_claude_code_command(config, executable),
        CliType::Codex => build_codex_command(config, executable),
    }
}

pub fn detect_installed_clis() -> Result<Vec<DetectedCli>, String> {
    let mut detected = Vec::new();

    let checks = vec![
        ("claude", CliType::ClaudeCode),
        ("codex", CliType::Codex),
    ];

    for (cli_name, cli_type) in checks {
        if let Ok(output) = Command::new("which").arg(cli_name).output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let version = Command::new(&path)
                    .arg("--version")
                    .output()
                    .ok()
                    .filter(|o| o.status.success())
                    .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

                detected.push(DetectedCli {
                    cli_type,
                    path,
                    version,
                });
            }
        }
    }

    Ok(detected)
}
