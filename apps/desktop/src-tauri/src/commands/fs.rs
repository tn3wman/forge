use crate::models::DirEntry;

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
}
