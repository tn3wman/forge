import { useCallback, useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor';
import { TabBar } from '../../components/TabBar';
import { Editor } from '../../components/Editor';
import { useFileContent } from '../../hooks/useFileContent';
import { useEditorModels } from '../../hooks/useEditorModels';
import { detectLanguage } from '../../lib/languageDetect';
import { fsIpc } from '../../ipc';

interface CenterPanelProps {
  openTabs: string[];
  activeTab: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export function CenterPanel({ openTabs, activeTab, onSelectTab, onCloseTab }: CenterPanelProps) {
  const { content, loading, error, updateContent } = useFileContent(activeTab);
  const editorModels = useEditorModels();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const prevTabRef = useRef<string | null>(null);

  // Save view state when switching away from a tab
  useEffect(() => {
    if (prevTabRef.current && editorRef.current && prevTabRef.current !== activeTab) {
      editorModels.saveViewState(prevTabRef.current, editorRef.current);
    }
    prevTabRef.current = activeTab;
  }, [activeTab, editorModels]);

  const handleEditorMount = useCallback(
    (ed: editor.IStandaloneCodeEditor) => {
      editorRef.current = ed;
      if (activeTab) {
        editorModels.restoreViewState(activeTab, ed);
      }
    },
    [activeTab, editorModels],
  );

  const handleSave = useCallback(async () => {
    if (!activeTab || content === null) return;
    await fsIpc.writeFile(activeTab, content);
    editorModels.markClean(activeTab);
  }, [activeTab, content, editorModels]);

  const handleCloseTab = useCallback(
    (path: string) => {
      editorModels.disposeModel(path);
      onCloseTab(path);
    },
    [editorModels, onCloseTab],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabBar
        tabs={openTabs}
        activeTab={activeTab}
        onSelect={onSelectTab}
        onClose={handleCloseTab}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {activeTab && content !== null ? (
          <Editor
            key={activeTab}
            filePath={activeTab}
            content={content}
            language={detectLanguage(activeTab)}
            onContentChange={(value) => updateContent(activeTab, value)}
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
