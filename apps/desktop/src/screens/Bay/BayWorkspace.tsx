import { useState, useEffect, useCallback, useRef } from 'react';
import type { Bay } from '@forge/core';
import type { WindowState } from '@forge/core';
import { bayIpc } from '../../ipc';
import {
  parseWindowState,
  serializeWindowState,
  DEFAULT_WINDOW_STATE,
} from '../../lib/windowState';
import { BayLayout } from './BayLayout';
import { LeftRail } from './LeftRail';
import { CenterPanel } from './CenterPanel';
import { RightRail } from './RightRail';
import styles from './BayWorkspace.module.css';

interface BayWorkspaceProps {
  bayId: string;
  onBack: () => void;
}

export function BayWorkspace({ bayId, onBack }: BayWorkspaceProps) {
  const [bay, setBay] = useState<Bay | null>(null);
  const [leftRailWidth, setLeftRailWidth] = useState(240);
  const [rightRailWidth, setRightRailWidth] = useState(300);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const windowStateRef = useRef<WindowState>(DEFAULT_WINDOW_STATE);

  useEffect(() => {
    bayIpc.open(bayId).then((b) => {
      setBay(b);
      const ws = parseWindowState(b.windowState);
      windowStateRef.current = ws;
      setLeftRailWidth(ws.leftRailWidth);
      setRightRailWidth(ws.rightRailWidth);
      setOpenTabs(ws.openTabs);
      setActiveTab(ws.activeTab);
    });
  }, [bayId]);

  const persistState = useCallback(() => {
    if (!bay) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      windowStateRef.current = {
        ...windowStateRef.current,
        leftRailWidth,
        rightRailWidth,
        openTabs,
        activeTab,
      };
      bayIpc.updateWindowState(bay.id, serializeWindowState(windowStateRef.current));
    }, 300);
  }, [bay, leftRailWidth, rightRailWidth, openTabs, activeTab]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    persistState();
  }, [openTabs, activeTab, persistState]);

  const handleFileSelect = useCallback((path: string) => {
    setOpenTabs((prev) => {
      if (prev.includes(path)) {
        setActiveTab(path);
        return prev;
      }
      const next = [...prev, path];
      setActiveTab(path);
      return next;
    });
  }, []);

  const handleSelectTab = useCallback((path: string) => {
    setActiveTab(path);
  }, []);

  const handleCloseTab = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      setActiveTab((current) => {
        if (current !== path) return current;
        const idx = prev.indexOf(path);
        return next[Math.min(idx, next.length - 1)] ?? null;
      });
      return next;
    });
  }, []);

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
        leftRail={<LeftRail bay={bay} onFileSelect={handleFileSelect} />}
        center={
          <CenterPanel
            openTabs={openTabs}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
          />
        }
        rightRail={<RightRail />}
      />
    </div>
  );
}
