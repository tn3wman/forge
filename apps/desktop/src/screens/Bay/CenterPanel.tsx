import { TabBar } from '../../components/TabBar';

interface CenterPanelProps {
  openTabs: string[];
  activeTab: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export function CenterPanel({ openTabs, activeTab, onSelectTab, onCloseTab }: CenterPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabBar tabs={openTabs} activeTab={activeTab} onSelect={onSelectTab} onClose={onCloseTab} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#52525b',
          fontFamily: 'system-ui',
          fontSize: '0.9rem',
        }}
      >
        {activeTab ? (
          <span
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#71717a' }}
          >
            {activeTab}
          </span>
        ) : (
          <span>Select a file to open</span>
        )}
      </div>
    </div>
  );
}
