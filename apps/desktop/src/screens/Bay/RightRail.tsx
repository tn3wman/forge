import { useState } from 'react';
import { CommandHistory } from '../../components/CommandLedger';
import { AgentLauncher } from '../../components/AgentLauncher';
import { AgentConfigPanel } from '../../components/AgentConfig';

type Tab = 'commands' | 'agent' | 'config';

interface RightRailProps {
  bayId?: string;
  projectPath?: string;
}

export function RightRail({ bayId, projectPath }: RightRailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('agent');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'agent', label: 'Agent' },
    { id: 'commands', label: 'Commands' },
    { id: 'config', label: 'Config' },
  ];

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'system-ui' }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #27272a',
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #a78bfa' : '2px solid transparent',
              color: activeTab === tab.id ? '#e4e4e7' : '#71717a',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {activeTab === 'commands' && bayId && <CommandHistory bayId={bayId} />}
        {activeTab === 'commands' && !bayId && (
          <div style={{ padding: '1rem', fontSize: '0.8rem', color: '#52525b' }}>
            No bay selected.
          </div>
        )}
        {activeTab === 'agent' && bayId && projectPath && (
          <AgentLauncher bayId={bayId} projectPath={projectPath} />
        )}
        {activeTab === 'agent' && (!bayId || !projectPath) && (
          <div style={{ padding: '1rem', fontSize: '0.8rem', color: '#52525b' }}>
            Open a project to use agents.
          </div>
        )}
        {activeTab === 'config' && <AgentConfigPanel />}
      </div>
    </div>
  );
}
