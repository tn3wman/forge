import { useState } from 'react';
import { CommandHistory } from '../../components/CommandLedger';

type Tab = 'commands';

interface RightRailProps {
  bayId?: string;
}

export function RightRail({ bayId }: RightRailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('commands');

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
        <button
          onClick={() => setActiveTab('commands')}
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontFamily: 'inherit',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'commands' ? '2px solid #a78bfa' : '2px solid transparent',
            color: activeTab === 'commands' ? '#e4e4e7' : '#71717a',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Commands
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {activeTab === 'commands' && bayId && <CommandHistory bayId={bayId} />}
        {activeTab === 'commands' && !bayId && (
          <div style={{ padding: '1rem', fontSize: '0.8rem', color: '#52525b' }}>
            No bay selected.
          </div>
        )}
      </div>
    </div>
  );
}
