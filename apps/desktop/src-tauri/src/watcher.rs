use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

impl From<&Event> for FsChangeEvent {
    fn from(event: &Event) -> Self {
        let kind = match event.kind {
            notify::EventKind::Create(_) => "create",
            notify::EventKind::Modify(_) => "modify",
            notify::EventKind::Remove(_) => "remove",
            _ => "other",
        };
        FsChangeEvent {
            kind: kind.to_string(),
            paths: event
                .paths
                .iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect(),
        }
    }
}

pub struct FileWatcher {
    _watcher: RecommendedWatcher,
}

impl FileWatcher {
    pub fn new<F>(path: &str, on_event: F) -> Result<Self, String>
    where
        F: Fn(FsChangeEvent) + Send + 'static,
    {
        let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

        let mut watcher = RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create watcher: {e}"))?;

        watcher
            .watch(Path::new(path), RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {e}"))?;

        std::thread::spawn(move || {
            while let Ok(result) = rx.recv() {
                if let Ok(event) = result {
                    match event.kind {
                        notify::EventKind::Create(_)
                        | notify::EventKind::Modify(_)
                        | notify::EventKind::Remove(_) => {
                            on_event(FsChangeEvent::from(&event));
                        }
                        _ => {}
                    }
                }
            }
        });

        Ok(FileWatcher { _watcher: watcher })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;
    use tempfile::tempdir;

    #[test]
    fn test_watcher_detects_file_creation() {
        let dir = tempdir().unwrap();
        let events: Arc<Mutex<Vec<FsChangeEvent>>> = Arc::new(Mutex::new(Vec::new()));
        let events_clone = events.clone();

        let _watcher = FileWatcher::new(
            &dir.path().to_string_lossy(),
            move |event| {
                events_clone.lock().unwrap().push(event);
            },
        )
        .unwrap();

        std::thread::sleep(Duration::from_millis(100));
        fs::write(dir.path().join("test.txt"), "hello").unwrap();
        std::thread::sleep(Duration::from_millis(500));

        let captured = events.lock().unwrap();
        assert!(!captured.is_empty(), "Should have captured at least one event");
    }
}
