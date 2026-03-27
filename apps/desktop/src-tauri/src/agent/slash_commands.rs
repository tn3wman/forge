use crate::models::agent::SlashCommandInfo;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

fn claude_builtin_commands() -> Vec<SlashCommandInfo> {
    vec![
        SlashCommandInfo { name: "help".into(), description: "Show available commands and help".into(), category: "builtin".into(), source: None },
        SlashCommandInfo { name: "compact".into(), description: "Compact conversation context".into(), category: "builtin".into(), source: None },
        SlashCommandInfo { name: "status".into(), description: "Show current session status".into(), category: "builtin".into(), source: None },
        SlashCommandInfo { name: "resume".into(), description: "Resume a previous conversation".into(), category: "builtin".into(), source: None },
        SlashCommandInfo { name: "cost".into(), description: "Show token usage and costs".into(), category: "builtin".into(), source: None },
        SlashCommandInfo { name: "config".into(), description: "View or change configuration".into(), category: "builtin".into(), source: None },
        SlashCommandInfo { name: "fast".into(), description: "Toggle fast output mode".into(), category: "builtin".into(), source: None },
        SlashCommandInfo { name: "bug".into(), description: "Report a bug".into(), category: "builtin".into(), source: None },
        SlashCommandInfo { name: "memory".into(), description: "View or edit CLAUDE.md memory".into(), category: "builtin".into(), source: None },
    ]
}

fn discover_plugin_skills() -> Vec<SlashCommandInfo> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return vec![],
    };

    let cache_dir = home.join(".claude").join("plugins").join("cache");
    if !cache_dir.exists() {
        return vec![];
    }

    let enabled_plugins = read_enabled_plugins(&home);
    let mut commands = Vec::new();

    // Walk: cache/<marketplace>/<plugin_name>/<version>/skills/<skill_name>/SKILL.md
    if let Ok(marketplaces) = fs::read_dir(&cache_dir) {
        for marketplace_entry in marketplaces.flatten() {
            let marketplace_path = marketplace_entry.path();
            if !marketplace_path.is_dir() { continue; }

            if let Ok(plugins) = fs::read_dir(&marketplace_path) {
                for plugin_entry in plugins.flatten() {
                    let plugin_path = plugin_entry.path();
                    if !plugin_path.is_dir() { continue; }

                    let plugin_name = plugin_entry.file_name().to_string_lossy().to_string();
                    let marketplace_name = marketplace_entry.file_name().to_string_lossy().to_string();
                    let plugin_key = format!("{}@{}", plugin_name, marketplace_name);

                    if !enabled_plugins.is_empty() && !enabled_plugins.contains_key(&plugin_key) {
                        continue;
                    }

                    if let Some(version_dir) = find_latest_version_dir(&plugin_path) {
                        let skills_dir = version_dir.join("skills");
                        if skills_dir.exists() {
                            if let Ok(skills) = fs::read_dir(&skills_dir) {
                                for skill_entry in skills.flatten() {
                                    let skill_md = skill_entry.path().join("SKILL.md");
                                    if skill_md.exists() {
                                        if let Some(cmd) = parse_skill_md(&skill_md, &plugin_name) {
                                            commands.push(cmd);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    commands
}

fn read_enabled_plugins(home: &PathBuf) -> HashMap<String, bool> {
    let settings_path = home.join(".claude").join("settings.json");
    if let Ok(content) = fs::read_to_string(&settings_path) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = val.get("enabledPlugins").and_then(|v| v.as_object()) {
                return obj
                    .iter()
                    .filter_map(|(k, v)| v.as_bool().map(|b| (k.clone(), b)))
                    .filter(|(_, enabled)| *enabled)
                    .collect();
            }
        }
    }
    HashMap::new()
}

fn find_latest_version_dir(plugin_path: &PathBuf) -> Option<PathBuf> {
    let mut versions: Vec<PathBuf> = fs::read_dir(plugin_path)
        .ok()?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter(|e| !e.file_name().to_string_lossy().starts_with("temp_"))
        .map(|e| e.path())
        .collect();
    versions.sort();
    versions.last().cloned()
}

fn parse_skill_md(path: &PathBuf, plugin_name: &str) -> Option<SlashCommandInfo> {
    let content = fs::read_to_string(path).ok()?;

    if !content.starts_with("---") {
        return None;
    }

    let end = content[3..].find("---")?;
    let frontmatter = &content[3..3 + end];

    let mut name = None;
    let mut description = None;

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("name:") {
            name = Some(val.trim().trim_matches('"').to_string());
        } else if let Some(val) = line.strip_prefix("description:") {
            description = Some(val.trim().trim_matches('"').to_string());
        }
    }

    let name = name?;
    let full_name = if plugin_name == &name {
        name
    } else {
        format!("{}:{}", plugin_name, name)
    };

    let desc = description.unwrap_or_default();
    let short_desc = if desc.len() > 120 {
        format!("{}...", &desc[..117])
    } else {
        desc
    };

    Some(SlashCommandInfo {
        name: full_name,
        description: short_desc,
        category: "skill".into(),
        source: Some(plugin_name.to_string()),
    })
}

pub fn discover_slash_commands(cli_name: &str) -> Vec<SlashCommandInfo> {
    match cli_name {
        "claude" => {
            if let Ok(commands) = super::claude_backend::ClaudeBackend::discover_slash_commands() {
                if !commands.is_empty() {
                    return commands;
                }
            }
            let mut commands = claude_builtin_commands();
            commands.extend(discover_plugin_skills());
            commands.sort_by(|a, b| a.category.cmp(&b.category).then(a.name.cmp(&b.name)));
            commands
        }
        _ => vec![],
    }
}
