use git2::{BranchType, Repository};

use crate::models::git::BranchInfo;

pub fn list_branches(path: &str) -> Result<Vec<BranchInfo>, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let branches = repo
        .branches(None)
        .map_err(|e| format!("Failed to list branches: {e}"))?;

    let head_oid = repo.head().ok().and_then(|r| r.target());

    let mut result = Vec::new();

    for branch_result in branches {
        let (branch, branch_type) = branch_result
            .map_err(|e| format!("Failed to read branch: {e}"))?;

        let name = branch
            .name()
            .map_err(|e| format!("Failed to get branch name: {e}"))?
            .unwrap_or("")
            .to_string();

        let is_remote = branch_type == BranchType::Remote;

        let target_oid = branch.get().target();
        let commit_oid = target_oid
            .map(|oid| oid.to_string())
            .unwrap_or_default();

        let commit_timestamp = target_oid
            .and_then(|oid| repo.find_commit(oid).ok())
            .map(|c| c.time().seconds())
            .unwrap_or(0);

        let is_head = !is_remote
            && head_oid.map(|h| h.to_string()) == Some(commit_oid.clone());

        // Check if branch is merged into HEAD
        let is_merged = match (target_oid, head_oid) {
            (Some(branch_oid), Some(head)) if branch_oid != head => {
                repo.graph_descendant_of(head, branch_oid).unwrap_or(false)
            }
            _ => false,
        };

        let upstream = branch
            .upstream()
            .ok()
            .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

        result.push(BranchInfo {
            name,
            is_head,
            is_remote,
            upstream,
            commit_oid,
            commit_timestamp,
            is_merged,
        });
    }

    Ok(result)
}

pub fn create_branch(
    path: &str,
    name: &str,
    from_ref: Option<&str>,
) -> Result<BranchInfo, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let target_commit = if let Some(ref_name) = from_ref {
        let reference = repo
            .resolve_reference_from_short_name(ref_name)
            .map_err(|e| format!("Failed to resolve ref '{ref_name}': {e}"))?;
        reference
            .peel_to_commit()
            .map_err(|e| format!("Failed to peel to commit: {e}"))?
    } else {
        repo.head()
            .map_err(|e| format!("Failed to get HEAD: {e}"))?
            .peel_to_commit()
            .map_err(|e| format!("Failed to peel HEAD to commit: {e}"))?
    };

    let branch = repo
        .branch(name, &target_commit, false)
        .map_err(|e| format!("Failed to create branch '{name}': {e}"))?;

    let commit_oid = branch
        .get()
        .target()
        .map(|oid| oid.to_string())
        .unwrap_or_default();

    let commit_timestamp = target_commit.time().seconds();

    Ok(BranchInfo {
        name: name.to_string(),
        is_head: false,
        is_remote: false,
        upstream: None,
        commit_oid,
        commit_timestamp,
        is_merged: false,
    })
}

pub fn checkout_branch(path: &str, name: &str) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    // Verify the branch exists
    repo.find_branch(name, BranchType::Local)
        .map_err(|_| format!("Branch '{name}' not found"))?;

    let refname = format!("refs/heads/{name}");

    // First try a safe checkout to detect conflicts with dirty working tree
    let obj = repo.revparse_single(&refname)
        .map_err(|e| format!("Failed to resolve '{name}': {e}"))?;

    repo.checkout_tree(
        &obj,
        Some(git2::build::CheckoutBuilder::new().safe()),
    )
    .map_err(|e| format!("Cannot checkout '{name}': {e}. Commit or stash your changes first."))?;

    repo.set_head(&refname)
        .map_err(|e| format!("Failed to set HEAD to '{name}': {e}"))?;

    Ok(())
}

pub fn delete_branch(path: &str, name: &str, force: bool) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    // Don't allow deleting the current branch
    if let Ok(head) = repo.head() {
        if head.is_branch() {
            if let Some(current) = head.shorthand() {
                if current == name {
                    return Err(format!("Cannot delete the current branch '{name}'. Switch to another branch first."));
                }
            }
        }
    }

    // Check if branch is checked out in a linked worktree
    if let Ok(worktree_names) = repo.worktrees() {
        for i in 0..worktree_names.len() {
            let wt_name = match worktree_names.get(i) {
                Some(n) => n.to_string(),
                None => continue,
            };
            if let Ok(wt) = repo.find_worktree(&wt_name) {
                // Open the worktree as a repo to check its HEAD
                if let Ok(wt_repo) = Repository::open(wt.path()) {
                    if let Ok(wt_head) = wt_repo.head() {
                        if wt_head.is_branch() {
                            if let Some(wt_branch) = wt_head.shorthand() {
                                if wt_branch == name {
                                    if force {
                                        // Remove the worktree first, then delete the branch
                                        crate::git::worktree::remove_worktree(path, &wt_name)?;
                                        break;
                                    } else {
                                        return Err(format!(
                                            "Branch '{name}' is checked out in worktree '{wt_name}'. Delete the worktree first or use force delete."
                                        ));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let mut branch = repo
        .find_branch(name, BranchType::Local)
        .map_err(|e| format!("Failed to find branch '{name}': {e}"))?;

    branch
        .delete()
        .map_err(|e| format!("Failed to delete branch '{name}': {e}"))?;

    Ok(())
}

pub fn delete_remote_branch(path: &str, remote: &str, branch: &str, token: &str) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut remote_obj = repo
        .find_remote(remote)
        .map_err(|e| format!("Failed to find remote '{remote}': {e}"))?;

    let callbacks = crate::git::remote::make_callbacks(token);
    let mut push_opts = git2::PushOptions::new();
    push_opts.remote_callbacks(callbacks);

    // Push empty source to delete the remote branch
    let refspec = format!(":refs/heads/{branch}");

    remote_obj
        .push(&[&refspec], Some(&mut push_opts))
        .map_err(|e| format!("Failed to delete remote branch '{remote}/{branch}': {e}"))?;

    Ok(())
}

pub fn rename_branch(path: &str, old_name: &str, new_name: &str) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut branch = repo
        .find_branch(old_name, BranchType::Local)
        .map_err(|e| format!("Failed to find branch '{old_name}': {e}"))?;

    branch
        .rename(new_name, false)
        .map_err(|e| format!("Failed to rename branch '{old_name}' to '{new_name}': {e}"))?;

    Ok(())
}

pub fn get_current_branch(path: &str) -> Result<Option<String>, String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let head = match repo.head() {
        Ok(head) => head,
        Err(_) => return Ok(None),
    };

    if head.is_branch() {
        Ok(head.shorthand().map(|s| s.to_string()))
    } else {
        Ok(None)
    }
}
