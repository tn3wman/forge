import { useCallback, useRef } from 'react';
import type { PaneNode } from '@forge/core';
import { EditorPane } from './EditorPane';
import styles from './SplitPane.module.css';

export interface SplitPaneProps {
  node: PaneNode;
  onSelectTab: (paneId: string, path: string) => void;
  onCloseTab: (paneId: string, path: string) => void;
  onSplitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
  onRatioChange?: (ratio: number) => void;
  bayId?: string;
  projectPath?: string;
}

export function SplitPane({
  node,
  onSelectTab,
  onCloseTab,
  onSplitPane,
  onRatioChange,
  bayId,
  projectPath,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (direction: 'horizontal' | 'vertical', currentRatio: number, e: React.MouseEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container || !onRatioChange) return;

      const isVertical = direction === 'vertical';
      const startPos = isVertical ? e.clientX : e.clientY;
      const containerSize = isVertical ? container.offsetWidth : container.offsetHeight;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const currentPos = isVertical ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - startPos;
        const deltaRatio = delta / containerSize;
        const newRatio = Math.min(0.85, Math.max(0.15, currentRatio + deltaRatio));
        onRatioChange(newRatio);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [onRatioChange],
  );

  if (node.type === 'leaf') {
    return (
      <EditorPane
        pane={node}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onSplitPane={onSplitPane}
        bayId={bayId}
        projectPath={projectPath}
      />
    );
  }

  const { direction, children, ratio } = node;

  return (
    <div
      ref={containerRef}
      className={styles.splitContainer}
      data-direction={direction}
      data-testid="split-container"
    >
      <div className={styles.paneWrapper} style={{ flex: ratio }}>
        <SplitPane
          node={children[0]}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSplitPane={onSplitPane}
          bayId={bayId}
          projectPath={projectPath}
        />
      </div>
      <div
        className={styles.resizeHandle}
        data-direction={direction}
        role="separator"
        aria-orientation={direction === 'vertical' ? 'vertical' : 'horizontal'}
        onMouseDown={(e) => startResize(direction, ratio, e)}
      />
      <div className={styles.paneWrapper} style={{ flex: 1 - ratio }}>
        <SplitPane
          node={children[1]}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSplitPane={onSplitPane}
          bayId={bayId}
          projectPath={projectPath}
        />
      </div>
    </div>
  );
}
