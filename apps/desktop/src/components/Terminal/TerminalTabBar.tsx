import { useState } from 'react';
import type { TerminalTab } from '@forge/core';
import styles from './TerminalTabBar.module.css';

interface Props {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onRename: (tabId: string, label: string) => void;
  onAdd: () => void;
}

export function TerminalTabBar({ tabs, activeTabId, onSelect, onClose, onRename, onAdd }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startRename = (tab: TerminalTab) => {
    setEditingId(tab.id);
    setEditValue(tab.label);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
          onClick={() => onSelect(tab.id)}
          onDoubleClick={() => startRename(tab)}
        >
          {tab.isExited && (
            <span className={styles.exitBadge} title={`Exit: ${tab.exitCode ?? 'signal'}`}>
              {tab.exitCode === 0 ? '\u2713' : '\u2717'}
            </span>
          )}
          {editingId === tab.id ? (
            <input
              className={styles.renameInput}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={styles.label}>{tab.label}</span>
          )}
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
          >
            {'\u00d7'}
          </button>
        </div>
      ))}
      <button className={styles.addBtn} onClick={onAdd} title="New Terminal">
        +
      </button>
    </div>
  );
}
