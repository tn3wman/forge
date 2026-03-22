import { useState } from 'react';
import type { AgentStreamEvent as StreamEvent } from '@forge/core';
import styles from './AgentStreamEvent.module.css';

interface Props {
  event: StreamEvent;
}

export function AgentStreamEvent({ event }: Props) {
  switch (event.type) {
    case 'assistant':
      return (
        <div className={styles.event}>
          <div className={styles.assistantBubble}>
            {event.message.model && (
              <span className={styles.modelBadge}>{event.message.model}</span>
            )}
            <span className={styles.assistantText}>{event.message.text}</span>
          </div>
        </div>
      );

    case 'tool_use':
      return <ToolUseEvent name={event.name} input={event.input} />;

    case 'tool_result':
      return (
        <div className={styles.event}>
          <div className={`${styles.toolResult} ${event.isError ? styles.toolResultError : ''}`}>
            <span className={styles.toolResultLabel}>
              {event.isError ? '\u2717 error' : '\u2713 result'}
            </span>
            <pre className={styles.toolOutput}>{event.output}</pre>
          </div>
        </div>
      );

    case 'result':
      return (
        <div className={styles.event}>
          <div className={styles.resultSummary}>
            <span className={styles.resultLabel}>Result</span>
            <span className={styles.resultText}>{event.text}</span>
            <div className={styles.resultMeta}>
              {event.cost != null && (
                <span className={styles.costBadge}>${event.cost.toFixed(4)}</span>
              )}
              {event.duration != null && (
                <span className={styles.durationBadge}>
                  {event.duration < 1000
                    ? `${event.duration}ms`
                    : `${(event.duration / 1000).toFixed(1)}s`}
                </span>
              )}
            </div>
          </div>
        </div>
      );

    case 'error':
      return (
        <div className={styles.event}>
          <div className={styles.errorMsg}>{event.error}</div>
        </div>
      );

    default:
      return null;
  }
}

function ToolUseEvent({ name, input }: { name: string; input: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.event}>
      <div className={styles.toolUse}>
        <button className={styles.toolToggle} onClick={() => setExpanded((prev) => !prev)}>
          <span className={styles.toolChevron}>{expanded ? '\u25be' : '\u25b8'}</span>
          <span className={styles.toolName}>{name}</span>
        </button>
        {expanded && <pre className={styles.toolInput}>{JSON.stringify(input, null, 2)}</pre>}
      </div>
    </div>
  );
}
