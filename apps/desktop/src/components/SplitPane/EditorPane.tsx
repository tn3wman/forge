import { useCallback, useEffect, useRef, useState } from 'react';
import type { editor, Monaco } from 'monaco-editor';
import type { PaneNode } from '@forge/core';
import { TabBar } from '../TabBar';
import { Editor } from '../Editor';
import { useFileContent } from '../../hooks/useFileContent';
import { useEditorModels } from '../../hooks/useEditorModels';
import { detectLanguage } from '../../lib/languageDetect';
import { fsIpc } from '../../ipc';
import { registerLspProviders } from '../Editor/lspProviders';

export interface EditorPaneProps {
  pane: PaneNode & { type: 'leaf' };
  onSelectTab: (paneId: string, path: string) => void;
  onCloseTab: (paneId: string, path: string) => void;
  onSplitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
  onOpenFile?: (paneId: string, path: string, line?: number, column?: number) => void;
  bayId?: string;
  projectPath?: string;
}

export function EditorPane({
  pane,
  onSelectTab,
  onCloseTab,
  onSplitPane: _onSplitPane,
  onOpenFile,
  bayId,
  projectPath: _projectPath,
}: EditorPaneProps) {
  const { id, tabs, activeTab } = pane;
  const { content, loading, error, updateContent } = useFileContent(activeTab);
  const editorModels = useEditorModels();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const prevTabRef = useRef<string | null>(null);
  const [dirtyTabs, setDirtyTabs] = useState<Set<string>>(new Set());
  const lspDisposablesRef = useRef<Array<{ dispose(): void }>>([]);
  const pendingCursorRef = useRef<{ path: string; line: number; column: number } | null>(null);

  // Save view state when switching away from a tab
  useEffect(() => {
    if (prevTabRef.current && editorRef.current && prevTabRef.current !== activeTab) {
      editorModels.saveViewState(prevTabRef.current, editorRef.current);
    }
    prevTabRef.current = activeTab;
  }, [activeTab, editorModels]);

  const handleEditorMount = useCallback(
    (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = ed;
      if (activeTab) {
        editorModels.restoreViewState(activeTab, ed);
      }
      // Register LSP providers for this editor's language
      if (bayId && activeTab) {
        // Dispose previous providers before registering new ones
        lspDisposablesRef.current.forEach((d) => d.dispose());
        const language = detectLanguage(activeTab);
        lspDisposablesRef.current = registerLspProviders(monaco, bayId, language);
      }
      // Apply pending cursor from cross-file navigation
      const pending = pendingCursorRef.current;
      if (pending && activeTab && pending.path === activeTab) {
        pendingCursorRef.current = null;
        ed.setPosition({ lineNumber: pending.line, column: pending.column });
        ed.revealLineInCenter(pending.line);
        ed.focus();
      }
    },
    [activeTab, editorModels, bayId],
  );

  const handleNavigateToFile = useCallback(
    (filePath: string, line: number, column: number) => {
      // Normalize file:// URI to plain path
      const normalizedPath = filePath.startsWith('file://')
        ? filePath.replace(/^file:\/\//, '')
        : filePath;
      // If it's the same file already active, just move the cursor
      if (normalizedPath === activeTab && editorRef.current) {
        editorRef.current.setPosition({ lineNumber: line, column });
        editorRef.current.revealLineInCenter(line);
        editorRef.current.focus();
        return;
      }
      // Cross-file: store pending cursor and open the file
      pendingCursorRef.current = { path: normalizedPath, line, column };
      onOpenFile?.(id, normalizedPath, line, column);
    },
    [activeTab, id, onOpenFile],
  );

  const handleSave = useCallback(async () => {
    if (!activeTab || content === null) return;
    await fsIpc.writeFile(activeTab, content);
    editorModels.markClean(activeTab);
    setDirtyTabs((prev) => {
      const next = new Set(prev);
      next.delete(activeTab);
      return next;
    });
  }, [activeTab, content, editorModels]);

  const handleCloseTab = useCallback(
    (path: string) => {
      editorModels.disposeModel(path);
      setDirtyTabs((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      onCloseTab(id, path);
    },
    [id, editorModels, onCloseTab],
  );

  const handleSelectTab = useCallback((path: string) => onSelectTab(id, path), [id, onSelectTab]);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      data-testid={`editor-pane-${id}`}
    >
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onSelect={handleSelectTab}
        onClose={handleCloseTab}
        dirtyTabs={dirtyTabs}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {activeTab && content !== null ? (
          <Editor
            key={activeTab}
            filePath={activeTab}
            content={content}
            language={detectLanguage(activeTab)}
            onContentChange={(value) => {
              updateContent(activeTab, value);
              setDirtyTabs((prev) => new Set(prev).add(activeTab));
            }}
            onSave={handleSave}
            onEditorMount={handleEditorMount}
            onNavigateToFile={handleNavigateToFile}
          />
        ) : activeTab && loading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#52525b',
            }}
          >
            Loading...
          </div>
        ) : activeTab && error ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        ) : (
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
            Select a file to open
          </div>
        )}
      </div>
    </div>
  );
}
