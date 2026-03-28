//! Resolve the user's full shell PATH for use in child process spawning.
//!
//! Bundled desktop apps (macOS .app, Linux .deb/.AppImage, Windows .exe) don't
//! inherit the user's interactive shell PATH. This module resolves it once at
//! startup and provides helpers so every spawn site can use it.

use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::OnceLock;

static SHELL_PATH: OnceLock<String> = OnceLock::new();

/// Returns the user's full PATH string, resolved from their login shell.
/// Cached after first call.
pub fn get_path() -> &'static str {
    SHELL_PATH.get_or_init(|| {
        if let Ok(path) = resolve_path() {
            tracing::info!("Resolved shell PATH ({} entries)", path.matches(':').count() + 1);
            return path;
        }
        tracing::warn!("Failed to resolve shell PATH, using fallback");
        build_fallback_path()
    })
}

/// Find a binary by name using the resolved shell PATH.
pub fn which(binary: &str) -> Result<PathBuf, String> {
    let path = get_path();
    which::which_in(binary, Some(path), ".")
        .map_err(|e| format!("'{}' not found in PATH: {e}", binary))
}

/// Set PATH on a `std::process::Command` before spawning.
pub fn apply_env(cmd: &mut Command) {
    cmd.env("PATH", get_path());
}

/// Set PATH on a `portable_pty::CommandBuilder` before spawning.
pub fn apply_env_pty(cmd: &mut portable_pty::CommandBuilder) {
    cmd.env("PATH", get_path());
}

// ---------------------------------------------------------------------------
// Platform-specific PATH resolution
// ---------------------------------------------------------------------------

#[cfg(unix)]
fn resolve_path() -> Result<String, String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let output = Command::new(&shell)
        .args(["-l", "-c", "echo $PATH"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .map_err(|e| format!("Failed to run login shell: {e}"))?;
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        Err("Login shell returned empty PATH".into())
    } else {
        Ok(path)
    }
}

#[cfg(windows)]
fn resolve_path() -> Result<String, String> {
    // On Windows, run `cmd /C echo %PATH%` which expands both system and user PATH
    let output = Command::new("cmd")
        .args(["/C", "echo", "%PATH%"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .map_err(|e| format!("Failed to run cmd: {e}"))?;
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() || path == "%PATH%" {
        Err("cmd returned empty PATH".into())
    } else {
        Ok(path)
    }
}

// ---------------------------------------------------------------------------
// Fallback: enrich current PATH with common tool locations
// ---------------------------------------------------------------------------

#[cfg(unix)]
fn build_fallback_path() -> String {
    let current = std::env::var("PATH").unwrap_or_default();
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());

    let candidates = [
        format!("{home}/.cargo/bin"),
        format!("{home}/.local/bin"),
        "/usr/local/bin".into(),
        "/opt/homebrew/bin".into(),
        "/opt/homebrew/sbin".into(),
        "/usr/local/sbin".into(),
    ];

    // Also look for nvm-managed node
    let nvm_dir = format!("{home}/.nvm/versions/node");
    let mut nvm_bins: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
        for entry in entries.flatten() {
            let bin = entry.path().join("bin");
            if bin.is_dir() {
                nvm_bins.push(bin.to_string_lossy().to_string());
            }
        }
        // Sort descending so latest version comes first
        nvm_bins.sort_by(|a, b| b.cmp(a));
    }

    let mut parts: Vec<&str> = current.split(':').collect();
    for bin in &nvm_bins {
        if !parts.contains(&bin.as_str()) {
            parts.push(bin);
        }
    }
    for candidate in &candidates {
        if std::path::Path::new(candidate).is_dir() && !parts.contains(&candidate.as_str()) {
            parts.push(candidate);
        }
    }

    parts.join(":")
}

#[cfg(windows)]
fn build_fallback_path() -> String {
    let current = std::env::var("PATH").unwrap_or_default();
    let home = std::env::var("USERPROFILE").unwrap_or_default();
    let appdata = std::env::var("APPDATA").unwrap_or_default();
    let localappdata = std::env::var("LOCALAPPDATA").unwrap_or_default();

    let candidates = [
        format!("{home}\\.cargo\\bin"),
        format!("{appdata}\\nvm"),
        format!("{localappdata}\\fnm_multishells"),
        format!("{localappdata}\\Programs\\nodejs"),
    ];

    let mut parts: Vec<&str> = current.split(';').collect();
    for candidate in &candidates {
        if std::path::Path::new(candidate).is_dir() && !parts.contains(&candidate.as_str()) {
            parts.push(candidate);
        }
    }

    parts.join(";")
}
