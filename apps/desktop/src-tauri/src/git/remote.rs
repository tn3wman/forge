use git2::{Cred, FetchOptions, PushOptions, RemoteCallbacks, Repository};

pub(crate) fn make_callbacks(token: &str) -> RemoteCallbacks<'_> {
    let mut callbacks = RemoteCallbacks::new();
    let token = token.to_string();
    callbacks.credentials(move |_url, _username, _allowed| {
        Cred::userpass_plaintext(&token, "x-oauth-basic")
    });
    callbacks
}

pub fn fetch(path: &str, remote_name: &str, token: &str) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut remote = repo
        .find_remote(remote_name)
        .map_err(|e| format!("Failed to find remote '{remote_name}': {e}"))?;

    let callbacks = make_callbacks(token);
    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let refspecs: Vec<String> = remote
        .fetch_refspecs()
        .map_err(|e| format!("Failed to get fetch refspecs: {e}"))?
        .iter()
        .filter_map(|s| s.map(|s| s.to_string()))
        .collect();

    let refspec_strs: Vec<&str> = refspecs.iter().map(|s| s.as_str()).collect();

    remote
        .fetch(&refspec_strs, Some(&mut fetch_opts), None)
        .map_err(|e| format!("Failed to fetch from '{remote_name}': {e}"))?;

    Ok(())
}

pub fn pull(
    path: &str,
    remote_name: &str,
    branch: &str,
    token: &str,
) -> Result<(), String> {
    // Fetch first
    fetch(path, remote_name, token)?;

    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    // Find the remote tracking branch
    let remote_ref_name = format!("{remote_name}/{branch}");
    let remote_ref = repo
        .resolve_reference_from_short_name(&remote_ref_name)
        .map_err(|e| format!("Failed to resolve remote ref '{remote_ref_name}': {e}"))?;

    let remote_commit = remote_ref
        .peel_to_commit()
        .map_err(|e| format!("Failed to peel remote ref to commit: {e}"))?;

    // Get local HEAD
    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {e}"))?;

    let local_commit = head
        .peel_to_commit()
        .map_err(|e| format!("Failed to peel HEAD to commit: {e}"))?;

    // Check if fast-forward is possible
    let (ahead, behind) = repo
        .graph_ahead_behind(local_commit.id(), remote_commit.id())
        .map_err(|e| format!("Failed to compute ahead/behind: {e}"))?;

    if ahead > 0 && behind > 0 {
        return Err("Branch has diverged, manual merge required".to_string());
    }

    if behind == 0 {
        // Already up to date
        return Ok(());
    }

    // Fast-forward: update HEAD ref to remote commit
    let refname = format!("refs/heads/{branch}");
    repo.reference(
        &refname,
        remote_commit.id(),
        true,
        &format!("pull: fast-forward {branch}"),
    )
    .map_err(|e| format!("Failed to update ref: {e}"))?;

    // Checkout the updated HEAD
    repo.set_head(&refname)
        .map_err(|e| format!("Failed to set HEAD: {e}"))?;

    repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
        .map_err(|e| format!("Failed to checkout: {e}"))?;

    Ok(())
}

pub fn push(
    path: &str,
    remote_name: &str,
    branch: &str,
    token: &str,
) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let mut remote = repo
        .find_remote(remote_name)
        .map_err(|e| format!("Failed to find remote '{remote_name}': {e}"))?;

    let callbacks = make_callbacks(token);
    let mut push_opts = PushOptions::new();
    push_opts.remote_callbacks(callbacks);

    let refspec = format!("refs/heads/{branch}:refs/heads/{branch}");

    remote
        .push(&[&refspec], Some(&mut push_opts))
        .map_err(|e| format!("Failed to push to '{remote_name}': {e}"))?;

    Ok(())
}
