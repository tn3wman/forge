import type { DetectedCli, CliType } from '@forge/core';
import styles from './AgentConfigPanel.module.css';

interface Props {
  detectedClis: DetectedCli[];
  configuredTypes: CliType[];
  onAdd: (cli: DetectedCli) => void;
  onDetect: () => void;
}

export function CliDetector({ detectedClis, configuredTypes, onAdd, onDetect }: Props) {
  return (
    <div className={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={styles.sectionTitle} style={{ border: 'none', paddingBottom: 0 }}>
          Detected CLIs
        </span>
        <button
          className={styles.closeBtn}
          onClick={onDetect}
          title="Re-scan for CLIs"
          style={{ fontSize: 11 }}
        >
          Detect
        </button>
      </div>

      {detectedClis.length === 0 && (
        <div className={styles.emptySection}>No CLIs detected on this system.</div>
      )}

      {detectedClis.map((cli) => {
        const alreadyConfigured = configuredTypes.includes(cli.cliType);
        return (
          <div key={cli.cliType} className={styles.configItem}>
            <div className={styles.configInfo}>
              <span className={styles.configName}>{cli.cliType}</span>
              <span className={styles.configMeta}>
                {cli.path}
                {cli.version ? ` (v${cli.version})` : ''}
              </span>
            </div>
            <div className={styles.configActions}>
              {alreadyConfigured ? (
                <span style={{ fontSize: 10, color: 'var(--text-secondary, #a6adc8)' }}>
                  Configured
                </span>
              ) : (
                <button onClick={() => onAdd(cli)}>Add</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
