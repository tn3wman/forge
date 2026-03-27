use git2::build::RepoBuilder;
use git2::FetchOptions;
use std::path::Path;

use super::remote::make_callbacks;

pub fn clone_repo(url: &str, local_path: &str, token: &str) -> Result<(), String> {
    let path = Path::new(local_path);

    if path.exists() && path.read_dir().map(|mut d| d.next().is_some()).unwrap_or(false) {
        return Err(format!(
            "Target directory is not empty: {}",
            path.display()
        ));
    }

    let callbacks = make_callbacks(token);
    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    RepoBuilder::new()
        .fetch_options(fetch_opts)
        .clone(url, path)
        .map_err(|e| format!("Failed to clone '{}': {}", url, e))?;

    Ok(())
}

pub fn get_remote_url(path: &str, remote_name: Option<&str>) -> Result<Option<String>, String> {
    let repo =
        git2::Repository::open(path).map_err(|e| format!("Failed to open repo: {e}"))?;

    let remote_name = remote_name.unwrap_or("origin");

    let url = repo
        .find_remote(remote_name)
        .ok()
        .and_then(|remote| remote.url().map(|s| s.to_string()));

    Ok(url)
}
