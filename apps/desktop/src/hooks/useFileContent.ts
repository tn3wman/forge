import { useState, useEffect, useRef, useCallback } from 'react';
import { fsIpc } from '../ipc';

interface FileContentResult {
  content: string | null;
  loading: boolean;
  error: string | null;
  updateContent: (path: string, content: string) => void;
}

export function useFileContent(filePath: string | null): FileContentResult {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!filePath) {
      setContent(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = cacheRef.current.get(filePath);
    if (cached !== undefined) {
      setContent(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    fsIpc
      .readFile(filePath)
      .then((text) => {
        cacheRef.current.set(filePath, text);
        setContent(text);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [filePath]);

  const updateContent = useCallback((path: string, newContent: string) => {
    cacheRef.current.set(path, newContent);
    setContent(newContent);
  }, []);

  return { content, loading, error, updateContent };
}
