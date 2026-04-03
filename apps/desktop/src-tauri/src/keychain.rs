use keyring::Entry;
use std::sync::Mutex;

const SERVICE_NAME: &str = "dev.forge.desktop";
const ACCOUNT_NAME: &str = "github_oauth_token";

// Legacy keychain identifiers (pre-v0.0.3) — used only for one-time migration.
const LEGACY_SERVICE_NAME: &str = "dev.forge.app";
const LEGACY_ACCOUNT_NAME: &str = "github_token";

/// In-memory token cache to avoid repeated macOS Keychain access prompts.
/// During development, each recompile produces a new unsigned binary that
/// macOS treats as untrusted, causing a Keychain permission dialog every time.
/// Caching the token in memory means the keychain is only read once per session.
pub struct TokenCache {
    inner: Mutex<Option<String>>,
}

impl TokenCache {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn get(&self) -> Option<String> {
        self.inner.lock().unwrap().clone()
    }

    pub fn set(&self, token: String) {
        *self.inner.lock().unwrap() = Some(token);
    }

    pub fn clear(&self) {
        *self.inner.lock().unwrap() = None;
    }

    pub fn require_token(&self) -> Result<String, String> {
        self.get().ok_or_else(|| "Not authenticated".to_string())
    }
}

pub fn store_token(token: &str) -> Result<(), String> {
    // On macOS, use the `security` CLI with the `-A` flag so that any binary
    // (including unsigned dev builds) can read the entry without a Keychain
    // prompt.  The `keyring` crate creates entries tied to the calling binary's
    // code-signature, which changes on every recompile.
    #[cfg(target_os = "macos")]
    {
        // Remove the old entry first (ignore "not found" errors).
        let _ = std::process::Command::new("security")
            .args(["delete-generic-password", "-s", SERVICE_NAME, "-a", ACCOUNT_NAME])
            .output();

        let output = std::process::Command::new("security")
            .args([
                "add-generic-password",
                "-s", SERVICE_NAME,
                "-a", ACCOUNT_NAME,
                "-w", token,
                "-A",          // allow access by any application
            ])
            .output()
            .map_err(|e| format!("Failed to store token: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to store token in keychain: {stderr}"));
        }
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|e| e.to_string())?;
        entry.set_password(token).map_err(|e| e.to_string())
    }
}

pub fn get_token() -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => {
            // Try migrating from the legacy keychain entry.
            migrate_legacy_token()
        }
        Err(e) => Err(e.to_string()),
    }
}

pub fn delete_token() -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Migrate a token from the legacy keychain entry (dev.forge.app / github_token)
/// to the new entry (dev.forge.desktop / github_oauth_token), then delete the old one.
fn migrate_legacy_token() -> Result<Option<String>, String> {
    let legacy = Entry::new(LEGACY_SERVICE_NAME, LEGACY_ACCOUNT_NAME).map_err(|e| e.to_string())?;
    match legacy.get_password() {
        Ok(token) => {
            // Store under the new key.
            store_token(&token)?;
            // Delete the legacy entry (best-effort).
            let _ = legacy.delete_credential();
            tracing::info!("Migrated GitHub token from legacy keychain entry");
            Ok(Some(token))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
