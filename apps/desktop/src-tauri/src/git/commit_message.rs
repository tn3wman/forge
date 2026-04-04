use std::io::Write;
use std::process::{Command, Stdio};
use std::time::Duration;

use crate::models::git::{DiffEntry, GeneratedCommitMessage};
use crate::shell_env;

const MAX_DIFF_CHARS: usize = 10_000;
const CLI_TIMEOUT: Duration = Duration::from_secs(60);

const PROMPT_TEMPLATE: &str = r#"Generate a git commit message for the following changes.

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, refactor, docs, test, chore, style, perf, build, ci
- Scope is optional — use it only when changes are clearly scoped to one area
- First line MUST be under 72 characters
- Add a blank line, then a brief body (1-3 sentences) explaining what changed and why
- Output ONLY the commit message text, nothing else — no markdown fences, no explanation

Diff of all changes:
"#;

/// Convert DiffEntry vec into a unified-diff-style text string for the prompt.
pub fn format_diff_for_prompt(entries: &[DiffEntry]) -> String {
    let mut out = String::new();

    for entry in entries {
        out.push_str(&format!("--- a/{}\n+++ b/{}\n", entry.path, entry.path));

        for hunk in &entry.hunks {
            out.push_str(&hunk.header);
            out.push('\n');

            for line in &hunk.lines {
                out.push_str(&line.origin);
                out.push_str(&line.content);
                if !line.content.ends_with('\n') {
                    out.push('\n');
                }
            }
        }

        if out.len() > MAX_DIFF_CHARS {
            out.truncate(MAX_DIFF_CHARS);
            out.push_str("\n[diff truncated]\n");
            break;
        }
    }

    out
}

/// Split raw commit message text into title + body.
fn split_title_body(text: &str) -> Result<GeneratedCommitMessage, String> {
    let text = text.trim();
    let (title, body) = match text.find("\n\n") {
        Some(pos) => (
            text[..pos].trim().to_string(),
            text[pos + 2..].trim().to_string(),
        ),
        None => (text.to_string(), String::new()),
    };

    if title.is_empty() {
        return Err("Generated an empty commit message".into());
    }

    Ok(GeneratedCommitMessage { title, body })
}

/// Wait for a child process with a timeout, then collect output.
fn wait_with_timeout(mut child: std::process::Child, label: &str) -> Result<std::process::Output, String> {
    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if start.elapsed() > CLI_TIMEOUT {
                    let _ = child.kill();
                    return Err(format!("{label} timed out after 60 seconds"));
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(e) => return Err(format!("Failed to wait for {label}: {e}")),
        }
    }
    child
        .wait_with_output()
        .map_err(|e| format!("Failed to read {label} output: {e}"))
}

/// Generate a commit message using the Claude CLI.
fn generate_with_claude(claude_path: &str, model: &str, prompt: &str) -> Result<GeneratedCommitMessage, String> {
    let cli = if claude_path.is_empty() {
        shell_env::which("claude")
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|_| "Claude CLI not found in PATH".to_string())?
    } else {
        claude_path.to_string()
    };

    let mut cmd = Command::new(&cli);
    cmd.args(["-p", prompt, "--output-format", "json"]);
    if !model.is_empty() {
        cmd.args(["--model", model]);
    }
    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    shell_env::apply_env(&mut cmd);

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to run Claude CLI: {e}"))?;

    let output = wait_with_timeout(child, "Claude CLI")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Claude CLI failed: {stderr}"));
    }

    // claude --output-format json returns: {"type":"result","result":"<the text>",...}
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse Claude output: {e}"))?;

    let result_text = json
        .get("result")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "No result field in Claude CLI output".to_string())?;

    split_title_body(result_text)
}

/// Generate a commit message using the Codex CLI.
fn generate_with_codex(prompt: &str) -> Result<GeneratedCommitMessage, String> {
    let cli = shell_env::which("codex")
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|_| "Codex CLI not found in PATH".to_string())?;

    let mut cmd = Command::new(&cli);
    cmd.arg("-q")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    shell_env::apply_env(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to run Codex CLI: {e}"))?;

    // Send prompt via stdin
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(prompt.as_bytes());
    }

    let output = wait_with_timeout(child, "Codex CLI")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Codex CLI failed: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    split_title_body(&stdout)
}

/// Generate a commit message by invoking an AI CLI (Claude or Codex).
///
/// `provider` can be `"claude"`, `"codex"`, or `"auto"` (default: try Claude, fall back to Codex).
pub fn generate(path: &str, claude_path: &str, provider: &str, model: &str) -> Result<GeneratedCommitMessage, String> {
    // 1. Get all changes (staged + unstaged + untracked)
    let entries = super::diff::get_all_diff(path)?;
    if entries.is_empty() {
        return Err("No changes detected to generate a commit message for".into());
    }

    // 2. Format diff into prompt
    let diff_text = format_diff_for_prompt(&entries);
    let prompt = format!("{PROMPT_TEMPLATE}{diff_text}");

    // 3. Dispatch to provider
    match provider {
        "claude" => generate_with_claude(claude_path, model, &prompt),
        "codex" => generate_with_codex(&prompt),
        _ => {
            // Auto: try Claude first, fall back to Codex
            match generate_with_claude(claude_path, model, &prompt) {
                Ok(msg) => Ok(msg),
                Err(claude_err) => {
                    tracing::info!("Claude unavailable ({claude_err}), falling back to Codex");
                    generate_with_codex(&prompt).map_err(|codex_err| {
                        format!("No AI CLI available. Claude: {claude_err} — Codex: {codex_err}")
                    })
                }
            }
        }
    }
}
