import type { CommandEntry } from '@forge/core';
import { commandLedgerIpc } from '../../ipc/commandLedger';
import styles from './CommandDetail.module.css';

interface Props {
  entry: CommandEntry;
  bayId: string;
  onBack: () => void;
}

export function CommandDetail({ entry, bayId, onBack }: Props) {
  const handleReplay = async () => {
    await commandLedgerIpc.execute({
      bayId,
      command: entry.command,
      cwd: entry.cwd,
      laneId: entry.laneId ?? undefined,
      agentId: entry.agentId ?? undefined,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.command);
  };

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          &larr; Back
        </button>
        <div className={styles.actions}>
          <button onClick={handleReplay} title="Replay command">
            Replay
          </button>
          <button onClick={handleCopy} title="Copy command">
            Copy
          </button>
        </div>
      </div>
      <div className={styles.field}>
        <label>Command</label>
        <code>{entry.command}</code>
      </div>
      <div className={styles.field}>
        <label>CWD</label>
        <code>{entry.cwd}</code>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label>Status</label>
          <span>{entry.status}</span>
        </div>
        <div className={styles.field}>
          <label>Exit Code</label>
          <span>{entry.exitCode ?? '-'}</span>
        </div>
        <div className={styles.field}>
          <label>Duration</label>
          <span>{entry.durationMs ? `${entry.durationMs}ms` : '-'}</span>
        </div>
      </div>
      {entry.laneId && (
        <div className={styles.field}>
          <label>Lane</label>
          <span className={styles.badge}>{entry.laneId}</span>
        </div>
      )}
      {entry.agentId && (
        <div className={styles.field}>
          <label>Agent</label>
          <span className={styles.badge}>{entry.agentId}</span>
        </div>
      )}
      {entry.stdoutPreview && (
        <div className={styles.field}>
          <label>stdout</label>
          <pre className={styles.preview}>{entry.stdoutPreview}</pre>
        </div>
      )}
      {entry.stderrPreview && (
        <div className={styles.field}>
          <label>stderr</label>
          <pre className={styles.preview}>{entry.stderrPreview}</pre>
        </div>
      )}
    </div>
  );
}
