CREATE TABLE IF NOT EXISTS command_ledger (
  id TEXT PRIMARY KEY,
  bay_id TEXT NOT NULL REFERENCES bays(id) ON DELETE CASCADE,
  lane_id TEXT,
  agent_id TEXT,
  terminal_id TEXT,
  command TEXT NOT NULL,
  cwd TEXT NOT NULL,
  env TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  exit_code INTEGER,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  duration_ms INTEGER,
  stdout_preview TEXT,
  stderr_preview TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_command_ledger_bay ON command_ledger(bay_id);
CREATE INDEX IF NOT EXISTS idx_command_ledger_lane ON command_ledger(lane_id);
CREATE INDEX IF NOT EXISTS idx_command_ledger_agent ON command_ledger(agent_id);
CREATE INDEX IF NOT EXISTS idx_command_ledger_status ON command_ledger(status);
CREATE INDEX IF NOT EXISTS idx_command_ledger_time ON command_ledger(started_at);
