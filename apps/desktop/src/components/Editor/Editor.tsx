import MonacoEditor from '@monaco-editor/react';
import type { editor, Monaco } from 'monaco-editor';
import { useRef, useCallback } from 'react';
import { FORGE_DARK_THEME } from './editorTheme';
import styles from './Editor.module.css';

export interface EditorProps {
  filePath: string;
  content: string;
  language: string;
  onContentChange?: (value: string) => void;
  onSave?: () => void;
  onEditorMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  onNavigateToFile?: (filePath: string, line: number, column: number) => void;
}

export function Editor({
  filePath: _filePath,
  content,
  language,
  onContentChange,
  onSave,
  onEditorMount,
  onNavigateToFile,
}: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    monaco.editor.defineTheme('forge-dark', FORGE_DARK_THEME);
  }, []);

  const handleMount = useCallback(
    (ed: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = ed;
      if (onSave) {
        ed.addAction({
          id: 'forge.save',
          label: 'Save File',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
          run: () => onSave(),
        });
      }
      if (onNavigateToFile) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const disposable = (monaco as any).editor.registerEditorOpener?.({
            openCodeEditor(
              _source: unknown,
              resource: { path: string },
              selectionOrPosition: {
                startLineNumber?: number;
                lineNumber?: number;
                startColumn?: number;
                column?: number;
              } | null,
            ) {
              const filePath = resource.path;
              const line =
                selectionOrPosition?.startLineNumber ?? selectionOrPosition?.lineNumber ?? 1;
              const column = selectionOrPosition?.startColumn ?? selectionOrPosition?.column ?? 1;
              onNavigateToFile(filePath, line, column);
              return true;
            },
          });
          // disposable is returned but we don't need to store it — Monaco will clean it up
          void disposable;
        } catch {
          // registerEditorOpener not available in this Monaco version — peek still works
        }
      }
      onEditorMount?.(ed, monaco);
    },
    [onSave, onEditorMount, onNavigateToFile],
  );

  return (
    <div className={styles.container}>
      <MonacoEditor
        language={language}
        theme="forge-dark"
        value={content}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={(value) => onContentChange?.(value ?? '')}
        options={{
          fontSize: 13,
          fontFamily: 'ui-monospace, monospace',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
