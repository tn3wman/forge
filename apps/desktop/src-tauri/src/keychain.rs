use keyring::Entry;
use std::sync::Mutex;

const SERVICE_NAME: &str = "dev.forge.app";
const ACCOUNT_NAME: &str = "github_token";

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
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|e| e.to_string())?;
    entry.set_password(token).map_err(|e| e.to_string())
}

pub fn get_token() -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
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
