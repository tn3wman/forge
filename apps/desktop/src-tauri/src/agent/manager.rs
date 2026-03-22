use super::instance::AgentInstance;
use crate::agent::adapter::{self, SpawnAgentConfig};
use crate::models::agent_cli::{AgentInfo, AgentStatus};
use rusqlite::Connection;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AgentManager {
    instances: Arc<Mutex<HashMap<String, AgentInstance>>>,
    db_path: PathBuf,
}

impl AgentManager {
    pub fn new(db_path: PathBuf) -> Self {
        // Clean up orphaned running sessions from previous crashes
        if let Ok(conn) = Connection::open(&db_path) {
            let _ = conn.execute(
                "UPDATE agent_sessions SET status = 'failed', completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE status = 'running'",
                [],
            );
        }
        AgentManager {
            instances: Arc::new(Mutex::new(HashMap::new())),
            db_path,
        }
    }

    pub fn spawn_agent(
        &self,
        config: SpawnAgentConfig,
        executable: &str,
        app_handle: tauri::AppHandle,
    ) -> Result<AgentInfo, String> {
        let id = uuid::Uuid::now_v7().to_string();
        let bay_id = config.bay_id.clone();
        let lane_id = config.lane_id.clone();
        let cli_type = config.cli_type.clone();

        let cmd = adapter::build_command(&config, executable);
        let instance = AgentInstance::spawn(
            id.clone(),
            bay_id,
            lane_id,
            cli_type,
            cmd,
            app_handle,
            self.db_path.clone(),
        )?;

        let info = instance.info();
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        instances.insert(id, instance);
        Ok(info)
    }

    pub fn send_message(&self, id: &str, msg: &str) -> Result<(), String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        instances
            .get(id)
            .ok_or_else(|| format!("Agent not found: {id}"))?
            .write(msg)
    }

    pub fn kill_agent(&self, id: &str) -> Result<(), String> {
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        let mut instance = instances
            .remove(id)
            .ok_or_else(|| format!("Agent not found: {id}"))?;
        instance.kill()
    }

    pub fn kill_all_for_bay(&self, bay_id: &str) -> Result<(), String> {
        let mut instances = self.instances.lock().map_err(|e| e.to_string())?;
        let ids: Vec<String> = instances
            .iter()
            .filter(|(_, inst)| inst.bay_id == bay_id)
            .map(|(id, _)| id.clone())
            .collect();
        for id in ids {
            if let Some(mut inst) = instances.remove(&id) {
                let _ = inst.kill();
            }
        }
        Ok(())
    }

    pub fn list_agents_for_bay(&self, bay_id: &str) -> Result<Vec<AgentInfo>, String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        Ok(instances
            .values()
            .filter(|inst| inst.bay_id == bay_id)
            .map(|inst| inst.info())
            .collect())
    }

    pub fn get_agent_status(&self, id: &str) -> Result<AgentStatus, String> {
        let instances = self.instances.lock().map_err(|e| e.to_string())?;
        let instance = instances
            .get(id)
            .ok_or_else(|| format!("Agent not found: {id}"))?;
        let status = instance.status.lock().map_err(|e| e.to_string())?;
        Ok(status.clone())
    }
}
