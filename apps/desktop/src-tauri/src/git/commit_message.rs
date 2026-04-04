use std::process::{Command, Stdio};
use std::time::Duration;

use crate::models::git::{DiffEntry, GeneratedCommitMessage};
use crate::shell_env;

const MAX_DIFF_CHARS: usize = 10_000;
const CLI_TIMEOUT: Duration = Duration::from_secs(60);

const PROMPT_TEMPLATE: &str = r#"Generate a git commit message for the following staged changes.

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, refactor, docs, test, chore, style, perf, build, ci
- Scope is optional — use it only when changes are clearly scoped to one area
- First line MUST be under 72 characters
- Add a blank line, then a brief body (1-3 sentences) explaining what changed and why
- Output ONLY the commit message text, nothing else — no markdown fences, no explanation

Staged diff:
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

/// Generate a commit message by invoking the Claude CLI in print mode.
pub fn generate(path: &str, claude_path: &str) -> Result<GeneratedCommitMessage, String> {
    // 1. Get staged diff
    let entries = super::diff::get_diff(path, true, None)?;
    if entries.is_empty() {
        return Err("No staged changes to generate a commit message for".into());
    }

    // 2. Format diff into prompt
    let diff_text = format_diff_for_prompt(&entries);
    let prompt = format!("{PROMPT_TEMPLATE}{diff_text}");

    // 3. Resolve Claude CLI binary
    let cli = if claude_path.is_empty() {
        shell_env::which("claude")
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|_| {
                "Claude CLI not found. Install it or set the path in Settings.".to_string()
            })?
    } else {
        claude_path.to_string()
    };

    // 4. Spawn claude -p
    let mut cmd = Command::new(&cli);
    cmd.args(["-p", &prompt, "--output-format", "json"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    shell_env::apply_env(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to run Claude CLI: {e}"))?;

    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if start.elapsed() > CLI_TIMEOUT {
                    let _ = child.kill();
                    return Err("Claude CLI timed out after 60 seconds".into());
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(e) => return Err(format!("Failed to wait for Claude CLI: {e}")),
        }
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to read Claude CLI output: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Claude CLI failed: {stderr}"));
    }

    // 5. Parse JSON output
    // claude --output-format json returns: {"type":"result","subtype":"success","cost_usd":...,"duration_ms":...,"duration_api_ms":...,"is_error":false,"num_turns":1,"result":"<the text>","session_id":"...","total_cost_usd":...}
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse CLI output: {e}"))?;

    let result_text = json
        .get("result")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "No result field in Claude CLI output".to_string())?;

    // 6. Split into title + body
    let result_text = result_text.trim();
    let (title, body) = match result_text.find("\n\n") {
        Some(pos) => (
            result_text[..pos].trim().to_string(),
            result_text[pos + 2..].trim().to_string(),
        ),
        None => (result_text.to_string(), String::new()),
    };

    if title.is_empty() {
        return Err("Claude generated an empty commit message".into());
    }

    Ok(GeneratedCommitMessage { title, body })
}
