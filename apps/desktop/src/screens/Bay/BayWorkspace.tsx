import { useState, useEffect, useCallback, useRef } from 'react';
import type { Bay } from '@forge/core';
import type { WindowState } from '@forge/core';
import { bayIpc } from '../../ipc';
import {
  parseWindowState,
  serializeWindowState,
  DEFAULT_WINDOW_STATE,
} from '../../lib/windowState';
import { usePaneLayout, createDefaultLayout, firstLeaf } from '../../hooks/usePaneLayout';
import { BayLayout } from './BayLayout';
import { LeftRail } from './LeftRail';
import { CenterPanel } from './CenterPanel';
import { RightRail } from './RightRail';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import styles from './BayWorkspace.module.css';

interface BayWorkspaceProps {
  bayId: string;
  onBack: () => void;
}

/** Build initial pane layout from WindowState, supporting old format without paneLayout. */
function layoutFromWindowState(ws: WindowState) {
  if (ws.paneLayout) return ws.paneLayout;
  // Backward compat: construct a single leaf from openTabs/activeTab
  return {
    type: 'leaf' as const,
    id: crypto.randomUUID(),
    tabs: ws.openTabs,
    activeTab: ws.activeTab,
  };
}

export function BayWorkspace({ bayId, onBack }: BayWorkspaceProps) {
  const [bay, setBay] = useState<Bay | null>(null);
  const [leftRailWidth, setLeftRailWidth] = useState(240);
  const [rightRailWidth, setRightRailWidth] = useState(300);
  const [initialized, setInitialized] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const windowStateRef = useRef<WindowState>(DEFAULT_WINDOW_STATE);
  const refreshKey = useFileWatcher(bay?.id ?? null, bay?.projectPath ?? null);

  const pane = usePaneLayout(createDefaultLayout());

  useEffect(() => {
    bayIpc.open(bayId).then((b) => {
      setBay(b);
      const ws = parseWindowState(b.windowState);
      windowStateRef.current = ws;
      setLeftRailWidth(ws.leftRailWidth);
      setRightRailWidth(ws.rightRailWidth);
      pane.updateLayout(layoutFromWindowState(ws));
      setInitialized(true);
    });
  }, [bayId]); // pane.updateLayout is stable (useCallback with no deps)

  const persistState = useCallback(() => {
    if (!bay) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Extract openTabs/activeTab from first leaf for backward compat
      const leaf = firstLeaf(pane.layout);
      windowStateRef.current = {
        ...windowStateRef.current,
        leftRailWidth,
        rightRailWidth,
        openTabs: leaf.tabs,
        activeTab: leaf.activeTab,
        paneLayout: pane.layout,
      };
      bayIpc.updateWindowState(bay.id, serializeWindowState(windowStateRef.current));
    }, 300);
  }, [bay, leftRailWidth, rightRailWidth, pane.layout]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialized) {
      persistState();
    }
  }, [pane.layout, initialized, persistState]);

  const handleFileSelect = useCallback(
    (path: string) => {
      // Open file in the first leaf pane
      const leaf = firstLeaf(pane.layout);
      pane.openFile(leaf.id, path);
    },
    [pane],
  );

  const handleSplitPane = useCallback(
    (paneId: string, direction: 'horizontal' | 'vertical') => {
      pane.splitPane(paneId, direction);
    },
    [pane],
  );

  // Keyboard shortcuts for splitting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+\ (or Ctrl+\) for vertical split
      if ((e.metaKey || e.ctrlKey) && e.key === '\\' && !e.shiftKey) {
        e.preventDefault();
        const leaf = firstLeaf(pane.layout);
        pane.splitPane(leaf.id, 'vertical');
      }
      // Cmd+Shift+\ (or Ctrl+Shift+\) for horizontal split
      if ((e.metaKey || e.ctrlKey) && e.key === '\\' && e.shiftKey) {
        e.preventDefault();
        const leaf = firstLeaf(pane.layout);
        pane.splitPane(leaf.id, 'horizontal');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pane]);

  if (!bay) {
    return (
      <div className={styles.loading}>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← Harbor
        </button>
        <span className={styles.bayName}>{bay.name}</span>
        {bay.gitBranch && <span className={styles.branchBadge}>{bay.gitBranch}</span>}
      </div>
      <BayLayout
        leftRailWidth={leftRailWidth}
        rightRailWidth={rightRailWidth}
        onLeftRailResize={setLeftRailWidth}
        onRightRailResize={setRightRailWidth}
        onResizeEnd={persistState}
        leftRail={<LeftRail bay={bay} onFileSelect={handleFileSelect} refreshKey={refreshKey} />}
        center={
          <CenterPanel
            paneLayout={pane.layout}
            onSelectTab={pane.selectTab}
            onCloseTab={pane.closeTab}
            onSplitPane={handleSplitPane}
          />
        }
        rightRail={<RightRail />}
      />
    </div>
  );
}
