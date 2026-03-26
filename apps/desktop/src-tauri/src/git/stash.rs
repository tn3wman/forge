use git2::{Repository, StashFlags};

use crate::models::git::StashEntry;

pub fn stash_push(
    path: &str,
    message: Option<&str>,
    include_untracked: bool,
) -> Result<String, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let sig = repo
        .signature()
        .map_err(|e| format!("Failed to get signature: {e}"))?;

    let mut flags = StashFlags::DEFAULT;
    if include_untracked {
        flags |= StashFlags::INCLUDE_UNTRACKED;
    }

    // Repository::stash requires &mut self
    let mut repo = repo;

    let oid = repo
        .stash_save(&sig, message.unwrap_or(""), Some(flags))
        .map_err(|e| format!("Failed to stash: {e}"))?;

    Ok(oid.to_string())
}

pub fn stash_list(path: &str) -> Result<Vec<StashEntry>, String> {
    let mut repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut raw_entries: Vec<(usize, String, git2::Oid)> = Vec::new();

    repo.stash_foreach(|index, message, oid| {
        raw_entries.push((index, message.to_string(), *oid));
        true
    })
    .map_err(|e| format!("Failed to list stashes: {e}"))?;

    let entries = raw_entries
        .into_iter()
        .map(|(index, message, oid)| {
            let timestamp = repo
                .find_commit(oid)
                .map(|c| c.time().seconds())
                .unwrap_or(0);
            StashEntry {
                index,
                message,
                timestamp,
            }
        })
        .collect();

    Ok(entries)
}

pub fn stash_pop(path: &str, index: usize) -> Result<(), String> {
    let mut repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    repo.stash_pop(index, None)
        .map_err(|e| format!("Failed to pop stash: {e}"))?;

    Ok(())
}

pub fn stash_apply(path: &str, index: usize) -> Result<(), String> {
    let mut repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    repo.stash_apply(index, None)
        .map_err(|e| format!("Failed to apply stash: {e}"))?;

    Ok(())
}

pub fn stash_drop(path: &str, index: usize) -> Result<(), String> {
    let mut repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    repo.stash_drop(index)
        .map_err(|e| format!("Failed to drop stash: {e}"))?;

    Ok(())
}
