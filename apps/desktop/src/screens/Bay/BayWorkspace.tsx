import { useState, useEffect, useCallback, useRef } from 'react';
import type { Bay, LspSymbol } from '@forge/core';
import type { WindowState } from '@forge/core';
import { bayIpc } from '../../ipc';
import { lspIpc } from '../../ipc/lsp';
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
import { SymbolSearch } from '../../components/SymbolSearch';
import styles from './BayWorkspace.module.css';

/** Derive LSP language ID from a file path's extension. */
function languageIdFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    rs: 'rust',
    py: 'python',
    go: 'go',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    sh: 'shellscript',
  };
  return map[ext] ?? 'plaintext';
}

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
  const [symbolSearchMode, setSymbolSearchMode] = useState<'file' | 'workspace' | null>(null);
  const [symbolResults, setSymbolResults] = useState<LspSymbol[]>([]);
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

  const handleOpenFile = useCallback(
    (paneId: string, path: string) => {
      pane.openFile(paneId, path);
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

  // Keyboard shortcuts for symbol search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'o') {
        e.preventDefault();
        setSymbolSearchMode('file');
        setSymbolResults([]);
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 't') {
        e.preventDefault();
        setSymbolSearchMode('workspace');
        setSymbolResults([]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSymbolQueryChange = useCallback(
    (query: string) => {
      if (!bay || !symbolSearchMode) return;
      if (symbolSearchMode === 'file') {
        const leaf = firstLeaf(pane.layout);
        const activeFile = leaf.activeTab;
        if (!activeFile) return;
        const uri = `file://${activeFile}`;
        const languageId = languageIdFromPath(activeFile);
        lspIpc
          .documentSymbols(bay.id, languageId, uri)
          .then((results) => {
            const filtered = query
              ? results.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
              : results;
            setSymbolResults(filtered);
          })
          .catch(() => setSymbolResults([]));
      } else {
        const leaf = firstLeaf(pane.layout);
        const activeFile = leaf.activeTab;
        const languageId = activeFile ? languageIdFromPath(activeFile) : 'typescript';
        lspIpc
          .workspaceSymbols(bay.id, languageId, query)
          .then(setSymbolResults)
          .catch(() => setSymbolResults([]));
      }
    },
    [bay, symbolSearchMode, pane.layout],
  );

  const handleSymbolSelect = useCallback(
    (symbol: LspSymbol) => {
      const filePath = symbol.location.uri.replace(/^file:\/\//, '');
      const leaf = firstLeaf(pane.layout);
      pane.openFile(leaf.id, filePath);
      setSymbolSearchMode(null);
      setSymbolResults([]);
    },
    [pane],
  );

  const handleSymbolClose = useCallback(() => {
    setSymbolSearchMode(null);
    setSymbolResults([]);
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
        leftRail={<LeftRail bay={bay} onFileSelect={handleFileSelect} refreshKey={refreshKey} />}
        center={
          <CenterPanel
            paneLayout={pane.layout}
            onSelectTab={pane.selectTab}
            onCloseTab={pane.closeTab}
            onSplitPane={handleSplitPane}
            onOpenFile={handleOpenFile}
            bayId={bay.id}
            projectPath={bay.projectPath}
          />
        }
        rightRail={<RightRail bayId={bay.id} projectPath={bay.projectPath} />}
      />
      {symbolSearchMode !== null && (
        <SymbolSearch
          mode={symbolSearchMode}
          results={symbolResults}
          onQueryChange={handleSymbolQueryChange}
          onSelect={handleSymbolSelect}
          onClose={handleSymbolClose}
        />
      )}
    </div>
  );
}
