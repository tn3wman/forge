import { useState, useCallback } from 'react';
import type { AgentInfo, AgentRole, CliType } from '@forge/core';
import { AGENT_ROLES, getRoleTemplate } from '@forge/core';
import { useAgentConfig } from '../../hooks/useAgentConfig';
import { useAgent } from '../../hooks/useAgent';
import { agentIpc } from '../../ipc/agent';
import { AgentStreamView } from '../AgentStream';
import styles from './AgentLauncher.module.css';

interface Props {
  bayId: string;
  projectPath: string;
}

export function AgentLauncher({ bayId, projectPath }: Props) {
  const { cliConfigs, detectedClis, loading } = useAgentConfig();
  const [prompt, setPrompt] = useState('');
  const [selectedRole, setSelectedRole] = useState<AgentRole>('builder');
  const [selectedCliType, setSelectedCliType] = useState<CliType>('claude_code');
  const [activeAgent, setActiveAgent] = useState<AgentInfo | null>(null);
  const [followUp, setFollowUp] = useState('');

  const { status, exitCode, sendMessage, kill } = useAgent(
    activeAgent?.id ?? null,
    activeAgent?.cliType ?? 'claude_code',
  );

  const hasAnyCli = detectedClis.length > 0 || cliConfigs.length > 0;

  const handleStart = useCallback(async () => {
    if (!prompt.trim()) return;

    const template = getRoleTemplate(selectedRole);
    try {
      const agent = await agentIpc.spawn({
        bayId,
        laneId: `lane-${Date.now()}`,
        cliType: selectedCliType,
        prompt: prompt.trim(),
        cwd: projectPath,
        systemPrompt: template?.systemPromptHint,
        allowedTools: template?.defaultAllowedTools,
      });
      setActiveAgent(agent);
    } catch (err) {
      console.error('Failed to spawn agent:', err);
    }
  }, [prompt, selectedRole, selectedCliType, bayId, projectPath]);

  const handleFollowUp = useCallback(async () => {
    if (!followUp.trim()) return;
    await sendMessage(followUp.trim());
    setFollowUp('');
  }, [followUp, sendMessage]);

  const handleNewAgent = useCallback(() => {
    setActiveAgent(null);
    setPrompt('');
    setFollowUp('');
  }, []);

  const handleKill = useCallback(async () => {
    await kill();
  }, [kill]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.noCli}>Loading agent config...</div>
      </div>
    );
  }

  if (!hasAnyCli) {
    return (
      <div className={styles.container}>
        <div className={styles.noCli}>
          No agent CLIs detected. Install Claude Code or Codex CLI, then check the Config tab.
        </div>
      </div>
    );
  }

  // Agent is active — show stream view
  if (activeAgent) {
    const isRunning = status === 'running';
    const isDone = status === 'completed' || status === 'failed' || status === 'killed';

    return (
      <div className={styles.container}>
        <div className={styles.activeBar}>
          <span>
            <span className={`${styles.statusDot} ${styles[status]}`} />
            {status === 'running' ? 'Agent running...' : `Agent ${status}`}
            {exitCode !== null && exitCode !== 0 && ` (exit ${exitCode})`}
          </span>
          {isRunning && (
            <button className={styles.killButton} onClick={handleKill}>
              Stop
            </button>
          )}
        </div>

        <div className={styles.streamContainer}>
          <AgentStreamView agentId={activeAgent.id} cliType={activeAgent.cliType} />
        </div>

        {isRunning && (
          <div className={styles.followUpRow}>
            <input
              className={styles.followUpInput}
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFollowUp();
                }
              }}
              placeholder="Send follow-up message..."
            />
            <button className={styles.sendButton} onClick={handleFollowUp}>
              Send
            </button>
          </div>
        )}

        {isDone && (
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <button className={styles.newButton} onClick={handleNewAgent}>
              Start New Agent
            </button>
          </div>
        )}
      </div>
    );
  }

  // No active agent — show prompt form
  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <textarea
          className={styles.promptInput}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe a task for the agent..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleStart();
            }
          }}
        />
        <div className={styles.selectors}>
          <select
            className={styles.select}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as AgentRole)}
          >
            {AGENT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={selectedCliType}
            onChange={(e) => setSelectedCliType(e.target.value as CliType)}
          >
            {detectedClis.map((cli) => (
              <option key={cli.cliType} value={cli.cliType}>
                {cli.cliType === 'claude_code' ? 'Claude Code' : 'Codex'}
                {cli.version ? ` (${cli.version})` : ''}
              </option>
            ))}
            {detectedClis.length === 0 &&
              cliConfigs.map((cfg) => (
                <option key={cfg.id} value={cfg.cliType}>
                  {cfg.displayName}
                </option>
              ))}
          </select>
        </div>
        <button className={styles.startButton} onClick={handleStart} disabled={!prompt.trim()}>
          Start Agent
        </button>
      </div>
    </div>
  );
}
