import { useEffect, useRef, useState } from 'react';
import type { CliType } from '@forge/core';
import { useAgent } from '../../hooks/useAgent';
import { AgentStreamEvent } from './AgentStreamEvent';
import styles from './AgentStreamView.module.css';

interface Props {
  agentId: string | null;
  cliType: CliType;
}

export function AgentStreamView({ agentId, cliType }: Props) {
  const { events, errors, status, kill } = useAgent(agentId, cliType);
  const listRef = useRef<HTMLDivElement>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events.length]);

  if (!agentId) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          No agent selected. Spawn an agent to see its output here.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={`${styles.statusDot} ${styles[status]}`} />
          <span>{status}</span>
          <span style={{ color: 'var(--text-secondary, #a6adc8)', fontSize: 11 }}>
            {events.length} events
          </span>
        </div>
        {status === 'running' && (
          <button className={styles.killBtn} onClick={kill}>
            Kill
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <>
          <button
            className={styles.errorsToggle}
            onClick={() => setErrorsExpanded((prev) => !prev)}
          >
            <span>{errorsExpanded ? '\u25be' : '\u25b8'}</span>
            {errors.length} error{errors.length !== 1 ? 's' : ''}
          </button>
          {errorsExpanded && (
            <div className={styles.errorsList}>
              {errors.map((err, i) => (
                <div key={i} className={styles.errorItem}>
                  {err}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className={styles.eventList} ref={listRef}>
        {events.length === 0 && <div className={styles.empty}>Waiting for agent output...</div>}
        {events.map((event, i) => (
          <AgentStreamEvent key={i} event={event} />
        ))}
      </div>
    </div>
  );
}
