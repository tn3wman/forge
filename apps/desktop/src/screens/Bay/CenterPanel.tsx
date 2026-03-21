import type { PaneNode } from '@forge/core';
import { SplitPane } from '../../components/SplitPane';

interface CenterPanelProps {
  paneLayout: PaneNode;
  onSelectTab: (paneId: string, path: string) => void;
  onCloseTab: (paneId: string, path: string) => void;
  onSplitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
}

export function CenterPanel({
  paneLayout,
  onSelectTab,
  onCloseTab,
  onSplitPane,
}: CenterPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <SplitPane
          node={paneLayout}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSplitPane={onSplitPane}
        />
      </div>
    </div>
  );
}
