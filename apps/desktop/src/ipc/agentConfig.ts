import { invoke } from '@tauri-apps/api/core';
import type { AgentCliConfig, RoleCliMapping } from '@forge/core';

export const agentConfigIpc = {
  createCliConfig: (
    cliType: string,
    displayName: string,
    executablePath: string,
    defaultModel?: string,
    defaultAllowedTools?: string,
    isDefault?: boolean,
  ): Promise<AgentCliConfig> =>
    invoke('agent_cli_config_create', {
      cliType,
      displayName,
      executablePath,
      defaultModel,
      defaultAllowedTools,
      isDefault: isDefault ?? false,
    }),
  listCliConfigs: (): Promise<AgentCliConfig[]> => invoke('agent_cli_config_list'),
  updateCliConfig: (
    id: string,
    displayName?: string,
    defaultModel?: string,
    defaultAllowedTools?: string,
    isDefault?: boolean,
  ): Promise<AgentCliConfig> =>
    invoke('agent_cli_config_update', {
      id,
      displayName,
      defaultModel,
      defaultAllowedTools,
      isDefault,
    }),
  deleteCliConfig: (id: string): Promise<void> => invoke('agent_cli_config_delete', { id }),
  setRoleMapping: (
    role: string,
    cliConfigId: string,
    modelOverride?: string,
    systemPromptOverride?: string,
    allowedToolsOverride?: string,
  ): Promise<RoleCliMapping> =>
    invoke('role_cli_mapping_set', {
      role,
      cliConfigId,
      modelOverride,
      systemPromptOverride,
      allowedToolsOverride,
    }),
  listRoleMappings: (): Promise<RoleCliMapping[]> => invoke('role_cli_mapping_list'),
  deleteRoleMapping: (role: string): Promise<void> => invoke('role_cli_mapping_delete', { role }),
};
