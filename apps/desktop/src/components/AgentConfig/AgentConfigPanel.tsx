import type { DetectedCli } from '@forge/core';
import { useAgentConfig } from '../../hooks/useAgentConfig';
import { agentConfigIpc } from '../../ipc/agentConfig';
import { CliDetector } from './CliDetector';
import { RoleMappingEditor } from './RoleMappingEditor';
import styles from './AgentConfigPanel.module.css';

interface Props {
  onClose?: () => void;
}

export function AgentConfigPanel({ onClose }: Props) {
  const { cliConfigs, roleMappings, detectedClis, loading, refresh } = useAgentConfig();

  const handleAddCli = async (cli: DetectedCli) => {
    const displayName = cli.cliType === 'claude_code' ? 'Claude Code' : 'Codex';
    await agentConfigIpc.createCliConfig(
      cli.cliType,
      displayName,
      cli.path,
      undefined,
      undefined,
      cliConfigs.length === 0,
    );
    await refresh();
  };

  const handleDeleteConfig = async (id: string) => {
    await agentConfigIpc.deleteCliConfig(id);
    await refresh();
  };

  const handleSetDefault = async (id: string) => {
    await agentConfigIpc.updateCliConfig(id, undefined, undefined, undefined, true);
    await refresh();
  };

  const handleSetMapping = async (role: string, cliConfigId: string) => {
    await agentConfigIpc.setRoleMapping(role, cliConfigId);
    await refresh();
  };

  const handleDeleteMapping = async (role: string) => {
    await agentConfigIpc.deleteRoleMapping(role);
    await refresh();
  };

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Agent Configuration</span>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        )}
      </div>

      <div className={styles.body}>
        <CliDetector
          detectedClis={detectedClis}
          configuredTypes={cliConfigs.map((c) => c.cliType)}
          onAdd={handleAddCli}
          onDetect={refresh}
        />

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Configured CLIs</span>
          {cliConfigs.length === 0 && (
            <div className={styles.emptySection}>No CLIs configured. Detect and add one above.</div>
          )}
          {cliConfigs.map((cfg) => (
            <div key={cfg.id} className={styles.configItem}>
              <div className={styles.configInfo}>
                <span className={styles.configName}>
                  {cfg.displayName}
                  {cfg.isDefault && <span className={styles.defaultBadge}>default</span>}
                </span>
                <span className={styles.configMeta}>
                  {cfg.cliType} &middot; {cfg.executablePath}
                  {cfg.defaultModel ? ` &middot; ${cfg.defaultModel}` : ''}
                </span>
              </div>
              <div className={styles.configActions}>
                {!cfg.isDefault && (
                  <button onClick={() => handleSetDefault(cfg.id)}>Set Default</button>
                )}
                <button className={styles.deleteBtn} onClick={() => handleDeleteConfig(cfg.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <RoleMappingEditor
          roleMappings={roleMappings}
          cliConfigs={cliConfigs}
          onSetMapping={handleSetMapping}
          onDeleteMapping={handleDeleteMapping}
        />
      </div>
    </div>
  );
}
