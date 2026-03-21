import { useState } from 'react';
import { useCommandLedger } from '../../hooks/useCommandLedger';
import { CommandFilters } from './CommandFilters';
import { CommandDetail } from './CommandDetail';
import styles from './CommandHistory.module.css';

interface Props {
  bayId: string;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const STATUS_ICON: Record<string, string> = {
  running: '\u25cf',
  completed: '\u2713',
  failed: '\u2717',
  killed: '\u25a0',
};

export function CommandHistory({ bayId }: Props) {
  const { commands, isLoading, filters, setFilters } = useCommandLedger(bayId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expanded = commands.find((c) => c.id === expandedId);

  if (expanded) {
    return <CommandDetail entry={expanded} bayId={bayId} onBack={() => setExpandedId(null)} />;
  }

  return (
    <div className={styles.container}>
      <CommandFilters filters={filters} onChange={setFilters} />
      <div className={styles.list}>
        {isLoading && <div className={styles.loading}>Loading...</div>}
        {!isLoading && commands.length === 0 && (
          <div className={styles.empty}>No commands recorded yet.</div>
        )}
        {commands.map((cmd) => (
          <div key={cmd.id} className={styles.entry} onClick={() => setExpandedId(cmd.id)}>
            <span className={`${styles.status} ${styles[cmd.status]}`}>
              {STATUS_ICON[cmd.status] ?? '?'}
            </span>
            <span className={styles.command}>{cmd.command}</span>
            <span className={styles.meta}>
              {formatDuration(cmd.durationMs)} · {formatTime(cmd.startedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
