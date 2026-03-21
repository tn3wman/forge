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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const windowStateRef = useRef<WindowState>(DEFAULT_WINDOW_STATE);

  useEffect(() => {
    bayIpc.open(bayId).then((b) => {
      setBay(b);
      const ws = parseWindowState(b.windowState);
      windowStateRef.current = ws;
      setLeftRailWidth(ws.leftRailWidth);
      setRightRailWidth(ws.rightRailWidth);
    });
  }, [bayId]);

  const persistState = useCallback(() => {
    if (!bay) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      windowStateRef.current = { ...windowStateRef.current, leftRailWidth, rightRailWidth };
      bayIpc.updateWindowState(bay.id, serializeWindowState(windowStateRef.current));
    }, 300);
  }, [bay, leftRailWidth, rightRailWidth]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
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
        leftRail={<LeftRail bay={bay} />}
        center={<CenterPanel />}
        rightRail={<RightRail />}
      />
    </div>
  );
}
