use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use notify_debouncer_mini::{new_debouncer, DebouncedEvent};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
pub struct RepoChangedPayload {
    pub path: String,
}

pub struct RepoWatcher {
    watchers:
        Arc<Mutex<HashMap<PathBuf, notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>>,
}

impl RepoWatcher {
    pub fn new() -> Self {
        Self {
            watchers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn watch(&self, path: &str, app_handle: AppHandle) -> Result<(), String> {
        let path_buf = PathBuf::from(path);
        let mut watchers = self.watchers.lock().unwrap();

        if watchers.contains_key(&path_buf) {
            return Ok(()); // Already watching
        }

        let emit_path = path.to_string();
        let mut debouncer = new_debouncer(
            std::time::Duration::from_millis(300),
            move |events: Result<Vec<DebouncedEvent>, notify::Error>| {
                if let Ok(events) = events {
                    let should_emit = events.iter().any(|e| {
                        let p = e.path.to_string_lossy();
                        // Ignore .git internals except HEAD, refs, index
                        if p.contains("/.git/") {
                            p.contains("/.git/HEAD")
                                || p.contains("/.git/refs/")
                                || p.ends_with("/.git/index")
                        } else {
                            true
                        }
                    });

                    if should_emit {
                        let _ = app_handle.emit(
                            "repo-changed",
                            RepoChangedPayload {
                                path: emit_path.clone(),
                            },
                        );
                    }
                }
            },
        )
        .map_err(|e| format!("Failed to create watcher: {e}"))?;

        // Watch the repo directory recursively
        debouncer
            .watcher()
            .watch(&path_buf, notify::RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {e}"))?;

        watchers.insert(path_buf, debouncer);
        Ok(())
    }

    pub fn unwatch(&self, path: &str) -> Result<(), String> {
        let path_buf = PathBuf::from(path);
        let mut watchers = self.watchers.lock().unwrap();
        watchers.remove(&path_buf);
        Ok(())
    }
}
