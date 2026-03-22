import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import type {
  AgentStatus,
  AgentStreamEvent,
  AgentDataEvent,
  AgentErrorEvent,
  AgentExitEvent,
  CliType,
} from '@forge/core';
import { parseAgentLine } from '@forge/core';
import { agentIpc } from '../ipc/agent';

export function useAgent(agentId: string | null, cliType: CliType = 'claude_code') {
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<AgentStatus>('running');
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    if (!agentId) return;

    const unlistenData = listen<AgentDataEvent>(`agent:data:${agentId}`, (event) => {
      const parsed = parseAgentLine(event.payload.data, cliType);
      if (parsed) {
        setEvents((prev) => [...prev, parsed]);
      }
    });

    const unlistenError = listen<AgentErrorEvent>(`agent:error:${agentId}`, (event) => {
      setErrors((prev) => [...prev, event.payload.error]);
    });

    const unlistenExit = listen<AgentExitEvent>(`agent:exit:${agentId}`, (event) => {
      setStatus(event.payload.status);
      setExitCode(event.payload.exitCode);
    });

    return () => {
      unlistenData.then((f) => f());
      unlistenError.then((f) => f());
      unlistenExit.then((f) => f());
    };
  }, [agentId, cliType]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (agentId) {
        await agentIpc.send(agentId, message);
      }
    },
    [agentId],
  );

  const kill = useCallback(async () => {
    if (agentId) {
      await agentIpc.kill(agentId);
    }
  }, [agentId]);

  return { events, errors, status, exitCode, sendMessage, kill };
}
