import type { RoleCliMapping, AgentCliConfig } from '@forge/core';
import { AGENT_ROLES } from '@forge/core';
import styles from './RoleMappingEditor.module.css';

interface Props {
  roleMappings: RoleCliMapping[];
  cliConfigs: AgentCliConfig[];
  onSetMapping: (role: string, cliConfigId: string) => void;
  onDeleteMapping: (role: string) => void;
}

function formatRoleName(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function RoleMappingEditor({
  roleMappings,
  cliConfigs,
  onSetMapping,
  onDeleteMapping,
}: Props) {
  const mappingsByRole = new Map(roleMappings.map((m) => [m.role, m]));

  return (
    <div className={styles.section}>
      <span className={styles.sectionTitle}>Role Mappings</span>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span className={styles.colRole}>Role</span>
          <span className={styles.colCli}>CLI</span>
          <span className={styles.colActions}></span>
        </div>
        {AGENT_ROLES.map((role) => {
          const mapping = mappingsByRole.get(role);
          const assignedConfig = mapping
            ? cliConfigs.find((c) => c.id === mapping.cliConfigId)
            : undefined;

          return (
            <div key={role} className={styles.tableRow}>
              <span className={styles.colRole}>
                {formatRoleName(role)}
                {mapping?.modelOverride && (
                  <span className={styles.modelOverride}>{mapping.modelOverride}</span>
                )}
              </span>
              <span className={styles.colCli}>
                {cliConfigs.length > 0 ? (
                  <select
                    className={styles.select}
                    value={mapping?.cliConfigId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        onSetMapping(role, val);
                      }
                    }}
                  >
                    <option value="">Not configured</option>
                    {cliConfigs.map((cfg) => (
                      <option key={cfg.id} value={cfg.id}>
                        {cfg.displayName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={styles.notConfigured}>
                    {assignedConfig?.displayName ?? 'Not configured'}
                  </span>
                )}
              </span>
              <span className={styles.colActions}>
                {mapping && (
                  <button
                    className={styles.removeBtn}
                    onClick={() => onDeleteMapping(role)}
                    title="Remove mapping"
                  >
                    &times;
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
