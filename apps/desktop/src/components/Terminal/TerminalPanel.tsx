import { useTerminalTabs } from '../../hooks/useTerminalTabs';
import { TerminalTabBar } from './TerminalTabBar';
import { TerminalView } from './TerminalView';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { PtyExitEvent } from '@forge/core';
import styles from './TerminalPanel.module.css';

interface Props {
  bayId: string;
  projectPath: string;
}

export function TerminalPanel({ bayId, projectPath }: Props) {
  const { tabs, activeTabId, addTab, removeTab, selectTab, renameTab, markExited } =
    useTerminalTabs(bayId);

  const handleAddTab = () => {
    addTab(projectPath, 80, 24);
  };

  useEffect(() => {
    const unlisteners = tabs.map((tab) => {
      if (tab.isExited) return null;
      return listen<PtyExitEvent>(`pty:exit:${tab.id}`, (event) => {
        markExited(tab.id, event.payload.exitCode);
      });
    });
    return () => {
      unlisteners.forEach((p) => p?.then((fn) => fn()));
    };
  }, [tabs, markExited]);

  return (
    <div className={styles.panel}>
      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={selectTab}
        onClose={removeTab}
        onRename={renameTab}
        onAdd={handleAddTab}
      />
      <div className={styles.content}>
        {tabs.length === 0 && (
          <div className={styles.empty}>No terminals open. Press + to create one.</div>
        )}
        {tabs.map((tab) => (
          <TerminalView key={tab.id} terminalId={tab.id} isVisible={tab.id === activeTabId} />
        ))}
      </div>
    </div>
  );
}
