use crate::models::terminal::CliInfo;
use std::process::Command;

struct CliSpec {
    binary: &'static str,
    display_name: &'static str,
}

const KNOWN_CLIS: &[CliSpec] = &[
    CliSpec { binary: "claude", display_name: "Claude Code" },
    CliSpec { binary: "codex", display_name: "OpenAI Codex CLI" },
    CliSpec { binary: "aider", display_name: "Aider" },
];

pub fn discover_clis() -> Vec<CliInfo> {
    KNOWN_CLIS
        .iter()
        .filter_map(|spec| {
            let path = which::which(spec.binary).ok()?;
            let version = Command::new(&path)
                .arg("--version")
                .output()
                .ok()
                .and_then(|out| {
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if s.is_empty() { None } else { Some(s) }
                });
            Some(CliInfo {
                name: spec.binary.to_string(),
                display_name: spec.display_name.to_string(),
                path: path.to_string_lossy().to_string(),
                version,
            })
        })
        .collect()
}
