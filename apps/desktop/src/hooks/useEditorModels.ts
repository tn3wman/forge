import { useRef, useCallback, useEffect } from 'react';
import type { editor, Monaco } from 'monaco-editor';

export function useEditorModels() {
  const modelsRef = useRef<Map<string, editor.ITextModel>>(new Map());
  const viewStatesRef = useRef<Map<string, editor.ICodeEditorViewState>>(new Map());
  const dirtyRef = useRef<Set<string>>(new Set());
  const disposablesRef = useRef<Map<string, { dispose: () => void }>>(new Map());

  const getOrCreateModel = useCallback(
    (monaco: Monaco, path: string, content: string, language: string): editor.ITextModel => {
      const existing = modelsRef.current.get(path);
      if (existing && !existing.isDisposed()) return existing;

      const uri = monaco.Uri.file(path);
      const model =
        monaco.editor.getModel(uri) ?? monaco.editor.createModel(content, language, uri);
      modelsRef.current.set(path, model);

      const disposable = model.onDidChangeContent(() => {
        dirtyRef.current.add(path);
      });
      disposablesRef.current.set(path, disposable);

      return model;
    },
    [],
  );

  const saveViewState = useCallback((path: string, ed: editor.IStandaloneCodeEditor) => {
    const state = ed.saveViewState();
    if (state) viewStatesRef.current.set(path, state);
  }, []);

  const restoreViewState = useCallback((path: string, ed: editor.IStandaloneCodeEditor) => {
    const state = viewStatesRef.current.get(path);
    if (state) ed.restoreViewState(state);
  }, []);

  const markClean = useCallback((path: string) => {
    dirtyRef.current.delete(path);
  }, []);

  const isDirty = useCallback((path: string) => dirtyRef.current.has(path), []);

  const disposeModel = useCallback((path: string) => {
    disposablesRef.current.get(path)?.dispose();
    disposablesRef.current.delete(path);
    const model = modelsRef.current.get(path);
    if (model && !model.isDisposed()) model.dispose();
    modelsRef.current.delete(path);
    viewStatesRef.current.delete(path);
    dirtyRef.current.delete(path);
  }, []);

  useEffect(() => {
    return () => {
      for (const [, d] of disposablesRef.current) d.dispose();
      for (const [, m] of modelsRef.current) {
        if (!m.isDisposed()) m.dispose();
      }
    };
  }, []);

  return { getOrCreateModel, saveViewState, restoreViewState, markClean, isDirty, disposeModel };
}
