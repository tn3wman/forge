use rusqlite::Connection;
use std::fs;
use std::path::Path;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: &Path) -> Result<Self, rusqlite::Error> {
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent).ok();
        }
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    pub fn run_migrations(&self) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let migration_001 = include_str!("../migrations/001_initial.sql");
        let migration_002 = include_str!("../migrations/002_command_ledger.sql");
        let migration_003 = include_str!("../migrations/003_agent_cli.sql");
        conn.execute_batch(migration_001)?;
        conn.execute_batch(migration_002)?;
        conn.execute_batch(migration_003)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_db() -> Database {
        let db = Database::new(Path::new(":memory:")).unwrap();
        db.run_migrations().unwrap();
        db
    }

    #[test]
    fn test_migrations_run_without_error() {
        let _db = test_db();
    }

    #[test]
    fn test_migrations_are_idempotent() {
        let db = test_db();
        db.run_migrations().unwrap();
    }

    #[test]
    fn test_insert_and_read_bay() {
        let db = test_db();
        let conn = db.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO bays (id, name, project_path, status) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["bay-1", "Test Project", "/tmp/test", "active"],
        )
        .unwrap();

        let name: String = conn
            .query_row("SELECT name FROM bays WHERE id = ?1", ["bay-1"], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(name, "Test Project");
    }

    #[test]
    fn test_insert_event() {
        let db = test_db();
        let conn = db.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO bays (id, name, project_path, status) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["bay-1", "Test", "/tmp/test", "active"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO events (id, bay_id, type, payload) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["evt-1", "bay-1", "bay.created", r#"{"name":"Test"}"#],
        )
        .unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_cascade_delete() {
        let db = test_db();
        let conn = db.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO bays (id, name, project_path, status) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["bay-1", "Test", "/tmp/test", "active"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO lanes (id, bay_id, goal, status) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["lane-1", "bay-1", "Fix auth", "idle"],
        )
        .unwrap();

        conn.execute("DELETE FROM bays WHERE id = 'bay-1'", [])
            .unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM lanes", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_command_ledger_table_exists() {
        let db = test_db();
        let conn = db.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO bays (id, name, project_path, status) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["bay-1", "Test", "/tmp/test", "active"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO command_ledger (id, bay_id, command, cwd) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["cmd-1", "bay-1", "echo hello", "/tmp"],
        )
        .unwrap();

        let status: String = conn
            .query_row(
                "SELECT status FROM command_ledger WHERE id = ?1",
                ["cmd-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(status, "running");
    }

    #[test]
    fn test_agent_cli_tables_exist() {
        let db = test_db();
        let conn = db.conn.lock().unwrap();

        // Insert a config
        conn.execute(
            "INSERT INTO agent_cli_configs (id, cli_type, display_name, executable_path) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["cfg-1", "claude_code", "Claude Code", "/usr/local/bin/claude"],
        )
        .unwrap();

        let display_name: String = conn
            .query_row(
                "SELECT display_name FROM agent_cli_configs WHERE id = ?1",
                ["cfg-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(display_name, "Claude Code");

        // Insert a role mapping
        conn.execute(
            "INSERT INTO role_cli_mappings (id, role, cli_config_id) VALUES (?1, ?2, ?3)",
            rusqlite::params!["map-1", "coder", "cfg-1"],
        )
        .unwrap();

        let role: String = conn
            .query_row(
                "SELECT role FROM role_cli_mappings WHERE id = ?1",
                ["map-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(role, "coder");

        // Insert an agent session (need a bay first)
        conn.execute(
            "INSERT INTO bays (id, name, project_path, status) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["bay-1", "Test", "/tmp/test", "active"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO agent_sessions (id, bay_id, lane_id, cli_type, prompt) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params!["sess-1", "bay-1", "lane-1", "claude_code", "Fix the bug"],
        )
        .unwrap();

        let status: String = conn
            .query_row(
                "SELECT status FROM agent_sessions WHERE id = ?1",
                ["sess-1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(status, "running");
    }

    #[test]
    fn test_command_ledger_cascade_delete() {
        let db = test_db();
        let conn = db.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO bays (id, name, project_path, status) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["bay-1", "Test", "/tmp/test", "active"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO command_ledger (id, bay_id, command, cwd) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["cmd-1", "bay-1", "echo hello", "/tmp"],
        )
        .unwrap();

        conn.execute("DELETE FROM bays WHERE id = 'bay-1'", [])
            .unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM command_ledger", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }
}
