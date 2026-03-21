import { useState, useCallback, useRef } from 'react';
import type { PaneNode } from '@forge/core';
import { SplitPane } from '../../components/SplitPane';
import { TerminalPanel } from '../../components/Terminal';

const MIN_TERMINAL_HEIGHT = 80;
const MAX_TERMINAL_HEIGHT = 600;
const DEFAULT_TERMINAL_HEIGHT = 250;

interface CenterPanelProps {
  paneLayout: PaneNode;
  onSelectTab: (paneId: string, path: string) => void;
  onCloseTab: (paneId: string, path: string) => void;
  onSplitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
  onOpenFile?: (paneId: string, path: string, line?: number, column?: number) => void;
  bayId?: string;
  projectPath?: string;
}

export function CenterPanel({
  paneLayout,
  onSelectTab,
  onCloseTab,
  onSplitPane,
  onOpenFile,
  bayId,
  projectPath,
}: CenterPanelProps) {
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = terminalHeight;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = startY - moveEvent.clientY;
        const newHeight = Math.min(
          MAX_TERMINAL_HEIGHT,
          Math.max(MIN_TERMINAL_HEIGHT, startHeight + delta),
        );
        setTerminalHeight(newHeight);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [terminalHeight],
  );

  const showTerminal = terminalVisible && bayId && projectPath;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <SplitPane
          node={paneLayout}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSplitPane={onSplitPane}
          onOpenFile={onOpenFile}
          bayId={bayId}
          projectPath={projectPath}
        />
      </div>

      {/* Divider bar */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize terminal panel"
        style={{
          height: '4px',
          background: '#27272a',
          cursor: 'row-resize',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onMouseDown={showTerminal ? startResize : undefined}
      >
        <button
          aria-label={terminalVisible ? 'Hide terminal' : 'Show terminal'}
          onClick={() => setTerminalVisible((v) => !v)}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#3f3f46',
            border: 'none',
            borderRadius: '3px',
            color: '#a1a1aa',
            cursor: 'pointer',
            fontSize: '10px',
            lineHeight: 1,
            padding: '2px 6px',
          }}
        >
          {terminalVisible ? '▼' : '▲'}
        </button>
      </div>

      {/* Terminal panel */}
      {showTerminal && (
        <div style={{ height: terminalHeight, flexShrink: 0, overflow: 'hidden' }}>
          <TerminalPanel bayId={bayId} projectPath={projectPath} />
        </div>
      )}
    </div>
  );
}
