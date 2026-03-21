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
  bayId?: string;
  projectPath?: string;
}

export function EditorPane({
  pane,
  onSelectTab,
  onCloseTab,
  onSplitPane: _onSplitPane,
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
    },
    [activeTab, editorModels, bayId],
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
