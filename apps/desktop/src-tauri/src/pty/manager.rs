use super::instance::{PtyInstance, TerminalInfo};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct PtyManager {
    instances: Arc<Mutex<HashMap<String, PtyInstance>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        PtyManager { instances: Arc::new(Mutex::new(HashMap::new())) }
    }

    pub fn spawn_terminal(&self, bay_id: String, cwd: String, cols: u16, rows: u16, label: Option<String>, app_handle: tauri::AppHandle) -> Result<TerminalInfo, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let label = label.unwrap_or_else(|| "Terminal".to_string());
        let instance = PtyInstance::spawn(id.clone(), bay_id.clone(), label.clone(), cwd, cols, rows, app_handle)?;
        let info = TerminalInfo { id: instance.id.clone(), bay_id: instance.bay_id.clone(), label: instance.label.clone() };
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        instances.insert(id, instance);
        Ok(info)
    }

    pub fn write_to_terminal(&self, terminal_id: &str, data: &str) -> Result<(), String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        instances.get(terminal_id).ok_or_else(|| format!("Terminal not found: {terminal_id}"))?.write(data)
    }

    pub fn resize_terminal(&self, terminal_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        instances.get(terminal_id).ok_or_else(|| format!("Terminal not found: {terminal_id}"))?.resize(cols, rows)
    }

    pub fn kill_terminal(&self, terminal_id: &str) -> Result<(), String> {
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        let mut instance = instances.remove(terminal_id).ok_or_else(|| format!("Terminal not found: {terminal_id}"))?;
        instance.kill()
    }

    pub fn kill_all_for_bay(&self, bay_id: &str) -> Result<(), String> {
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        let ids: Vec<String> = instances.iter().filter(|(_, inst)| inst.bay_id == bay_id).map(|(id, _)| id.clone()).collect();
        for id in ids { if let Some(mut inst) = instances.remove(&id) { let _ = inst.kill(); } }
        Ok(())
    }

    pub fn rename_terminal(&self, terminal_id: &str, label: String) -> Result<(), String> {
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        instances.get_mut(terminal_id).ok_or_else(|| format!("Terminal not found: {terminal_id}"))?.label = label;
        Ok(())
    }

    pub fn list_terminals_for_bay(&self, bay_id: &str) -> Result<Vec<TerminalInfo>, String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        Ok(instances.values().filter(|inst| inst.bay_id == bay_id)
            .map(|inst| TerminalInfo { id: inst.id.clone(), bay_id: inst.bay_id.clone(), label: inst.label.clone() }).collect())
    }
}
