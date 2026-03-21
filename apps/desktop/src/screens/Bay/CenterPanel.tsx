import { useCallback } from 'react';
import { TabBar } from '../../components/TabBar';
import { Editor } from '../../components/Editor';
import { useFileContent } from '../../hooks/useFileContent';
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

  const handleSave = useCallback(async () => {
    if (!activeTab || content === null) return;
    await fsIpc.writeFile(activeTab, content);
  }, [activeTab, content]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabBar tabs={openTabs} activeTab={activeTab} onSelect={onSelectTab} onClose={onCloseTab} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {activeTab && content !== null ? (
          <Editor
            filePath={activeTab}
            content={content}
            language={detectLanguage(activeTab)}
            onContentChange={(value) => updateContent(activeTab, value)}
            onSave={handleSave}
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
