use crate::models::DirEntry;
use crate::watcher::FileWatcher;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

pub struct WatcherState {
    pub watchers: Mutex<HashMap<String, FileWatcher>>,
}

#[tauri::command]
pub fn read_directory(path: String, show_hidden: bool) -> Result<Vec<DirEntry>, String> {
    let read_dir = std::fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

    let mut entries: Vec<DirEntry> = Vec::new();

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();

        if !show_hidden && name.starts_with('.') {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read metadata for '{}': {}", name, e))?;

        let is_symlink = entry
            .path()
            .symlink_metadata()
            .map(|m| m.file_type().is_symlink())
            .unwrap_or(false);

        entries.push(DirEntry {
            path: entry.path().to_string_lossy().to_string(),
            name,
            is_dir: metadata.is_dir(),
            is_symlink,
        });
    }

    // Sort: directories first, then alphabetical (case-insensitive)
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

#[tauri::command]
pub fn start_file_watcher(
    bay_id: String,
    path: String,
    app: AppHandle,
    watcher_state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut watchers = watcher_state.watchers.lock().map_err(|e| e.to_string())?;
    watchers.remove(&bay_id);
    let watcher = FileWatcher::new(&path, move |event| {
        let _ = app.emit("fs-change", event);
    })?;
    watchers.insert(bay_id, watcher);
    Ok(())
}

#[tauri::command]
pub fn stop_file_watcher(
    bay_id: String,
    watcher_state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut watchers = watcher_state.watchers.lock().map_err(|e| e.to_string())?;
    watchers.remove(&bay_id);
    Ok(())
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content)
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_read_directory_lists_files_and_dirs() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("hello.txt"), "content").unwrap();
        fs::create_dir(dir.path().join("subdir")).unwrap();
        fs::write(dir.path().join(".hidden"), "secret").unwrap();

        let entries = read_directory(dir.path().to_string_lossy().to_string(), false).unwrap();
        assert_eq!(entries.len(), 2);
        assert!(entries[0].is_dir);
        assert_eq!(entries[0].name, "subdir");
        assert!(!entries[1].is_dir);
        assert_eq!(entries[1].name, "hello.txt");
    }

    #[test]
    fn test_read_directory_shows_hidden_when_requested() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("visible.txt"), "content").unwrap();
        fs::write(dir.path().join(".hidden"), "secret").unwrap();

        let entries = read_directory(dir.path().to_string_lossy().to_string(), true).unwrap();
        assert_eq!(entries.len(), 2);
    }

    #[test]
    fn test_read_directory_invalid_path_returns_error() {
        let result = read_directory("/nonexistent/path/xyz".to_string(), false);
        assert!(result.is_err());
    }

    #[test]
    fn test_read_file_returns_contents() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        fs::write(&file_path, "hello world").unwrap();
        let result = read_file(file_path.to_string_lossy().to_string()).unwrap();
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_read_file_nonexistent_returns_error() {
        let result = read_file("/nonexistent/file.txt".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_write_file_creates_and_writes() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("output.txt");
        write_file(file_path.to_string_lossy().to_string(), "saved content".to_string()).unwrap();
        let contents = fs::read_to_string(&file_path).unwrap();
        assert_eq!(contents, "saved content");
    }

    #[test]
    fn test_write_file_overwrites_existing() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("existing.txt");
        fs::write(&file_path, "old").unwrap();
        write_file(file_path.to_string_lossy().to_string(), "new".to_string()).unwrap();
        assert_eq!(fs::read_to_string(&file_path).unwrap(), "new");
    }
}
