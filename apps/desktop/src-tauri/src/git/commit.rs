use std::path::Path;

use git2::Repository;

pub fn stage_files(path: &str, paths: &[String]) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {e}"))?;

    for file_path in paths {
        index
            .add_path(Path::new(file_path))
            .map_err(|e| format!("Failed to stage '{file_path}': {e}"))?;
    }

    index
        .write()
        .map_err(|e| format!("Failed to write index: {e}"))?;

    Ok(())
}

pub fn unstage_files(path: &str, paths: &[String]) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let head = repo.head().ok().and_then(|r| r.peel_to_tree().ok());

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {e}"))?;

    for file_path in paths {
        if let Some(ref tree) = head {
            // Reset to HEAD tree entry
            let entry = tree.get_path(Path::new(file_path));
            match entry {
                Ok(tree_entry) => {
                    let index_entry = git2::IndexEntry {
                        ctime: git2::IndexTime::new(0, 0),
                        mtime: git2::IndexTime::new(0, 0),
                        dev: 0,
                        ino: 0,
                        mode: tree_entry.filemode() as u32,
                        uid: 0,
                        gid: 0,
                        file_size: 0,
                        id: tree_entry.id(),
                        flags: 0,
                        flags_extended: 0,
                        path: file_path.as_bytes().to_vec(),
                    };
                    index
                        .add(&index_entry)
                        .map_err(|e| format!("Failed to unstage '{file_path}': {e}"))?;
                }
                Err(_) => {
                    // File was newly added, remove from index
                    index
                        .remove_path(Path::new(file_path))
                        .map_err(|e| format!("Failed to remove '{file_path}' from index: {e}"))?;
                }
            }
        } else {
            // No HEAD (initial commit), remove from index
            index
                .remove_path(Path::new(file_path))
                .map_err(|e| format!("Failed to remove '{file_path}' from index: {e}"))?;
        }
    }

    index
        .write()
        .map_err(|e| format!("Failed to write index: {e}"))?;

    Ok(())
}

pub fn stage_all(path: &str) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {e}"))?;

    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to stage all: {e}"))?;

    index
        .write()
        .map_err(|e| format!("Failed to write index: {e}"))?;

    Ok(())
}

pub fn create_commit(path: &str, message: &str) -> Result<String, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let sig = repo
        .signature()
        .map_err(|e| format!("Failed to get signature: {e}"))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {e}"))?;

    let tree_oid = index
        .write_tree()
        .map_err(|e| format!("Failed to write tree: {e}"))?;

    let tree = repo
        .find_tree(tree_oid)
        .map_err(|e| format!("Failed to find tree: {e}"))?;

    let parents = match repo.head() {
        Ok(head) => {
            let commit = head
                .peel_to_commit()
                .map_err(|e| format!("Failed to peel HEAD to commit: {e}"))?;
            vec![commit]
        }
        Err(_) => vec![], // Initial commit
    };

    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)
        .map_err(|e| format!("Failed to create commit: {e}"))?;

    Ok(oid.to_string())
}

pub fn amend_commit(path: &str, message: &str) -> Result<String, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {e}"))?;

    let head_commit = head
        .peel_to_commit()
        .map_err(|e| format!("Failed to peel HEAD to commit: {e}"))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {e}"))?;

    let tree_oid = index
        .write_tree()
        .map_err(|e| format!("Failed to write tree: {e}"))?;

    let tree = repo
        .find_tree(tree_oid)
        .map_err(|e| format!("Failed to find tree: {e}"))?;

    let sig = repo
        .signature()
        .map_err(|e| format!("Failed to get signature: {e}"))?;

    let oid = head_commit
        .amend(
            Some("HEAD"),
            Some(&sig),
            Some(&sig),
            None, // encoding
            Some(message),
            Some(&tree),
        )
        .map_err(|e| format!("Failed to amend commit: {e}"))?;

    Ok(oid.to_string())
}
