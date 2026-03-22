import { invoke } from '@tauri-apps/api/core';
import type { AgentInfo, AgentStatus, DetectedCli, SpawnAgentConfig } from '@forge/core';

export const agentIpc = {
  spawn: (config: SpawnAgentConfig): Promise<AgentInfo> => invoke('agent_spawn', { config }),
  send: (agentId: string, message: string): Promise<void> =>
    invoke('agent_send', { agentId, message }),
  kill: (agentId: string): Promise<void> => invoke('agent_kill', { agentId }),
  killAll: (bayId: string): Promise<void> => invoke('agent_kill_all', { bayId }),
  list: (bayId: string): Promise<AgentInfo[]> => invoke('agent_list', { bayId }),
  status: (agentId: string): Promise<AgentStatus> => invoke('agent_status', { agentId }),
  detectClis: (): Promise<DetectedCli[]> => invoke('agent_detect_clis'),
};
