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
        let migration_sql = include_str!("../migrations/001_initial.sql");
        conn.execute_batch(migration_sql)?;
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
}
