import { useState, useEffect, useCallback } from 'react';
import type { AgentCliConfig, RoleCliMapping, DetectedCli } from '@forge/core';
import { agentConfigIpc } from '../ipc/agentConfig';
import { agentIpc } from '../ipc/agent';

export function useAgentConfig() {
  const [cliConfigs, setCliConfigs] = useState<AgentCliConfig[]>([]);
  const [roleMappings, setRoleMappings] = useState<RoleCliMapping[]>([]);
  const [detectedClis, setDetectedClis] = useState<DetectedCli[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, mappings, detected] = await Promise.all([
        agentConfigIpc.listCliConfigs(),
        agentConfigIpc.listRoleMappings(),
        agentIpc.detectClis(),
      ]);
      setCliConfigs(configs);
      setRoleMappings(mappings);
      setDetectedClis(detected);
    } catch (err) {
      console.error('Failed to load agent config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { cliConfigs, roleMappings, detectedClis, loading, refresh };
}
