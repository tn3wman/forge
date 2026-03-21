import { useState, useEffect, useCallback, useRef } from 'react';
import type { DirEntry } from '@forge/core';
import { fsIpc } from '../../ipc';
import { FileTreeItem } from './FileTreeItem';
import styles from './FileTree.module.css';

interface FileTreeProps {
  rootPath: string;
  onFileSelect: (path: string) => void;
  refreshKey?: number;
}

export function FileTree({ rootPath, onFileSelect, refreshKey }: FileTreeProps) {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Record<string, DirEntry[]>>({});
  const [loading, setLoading] = useState(true);

  // Mutable refs as the authoritative sources for toggle logic — avoids stale closures
  const expandedRef = useRef<Set<string>>(new Set());
  const childrenCacheRef = useRef<Record<string, DirEntry[]>>({});
  const pendingFetches = useRef<Set<string>>(new Set());

  const loadDirectory = useCallback(async (path: string): Promise<DirEntry[]> => {
    return fsIpc.readDirectory(path, false);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadDirectory(rootPath)
      .then((result) => {
        setEntries(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rootPath, loadDirectory, refreshKey]);

  const handleToggle = useCallback(
    async (dirPath: string) => {
      const isCurrentlyExpanded = expandedRef.current.has(dirPath);

      if (isCurrentlyExpanded) {
        expandedRef.current.delete(dirPath);
        setExpanded(new Set(expandedRef.current));
        return;
      }

      expandedRef.current.add(dirPath);
      setExpanded(new Set(expandedRef.current));

      if (!childrenCacheRef.current[dirPath] && !pendingFetches.current.has(dirPath)) {
        pendingFetches.current.add(dirPath);
        try {
          const children = await loadDirectory(dirPath);
          childrenCacheRef.current = { ...childrenCacheRef.current, [dirPath]: children };
          setChildrenCache({ ...childrenCacheRef.current });
        } finally {
          pendingFetches.current.delete(dirPath);
        }
      }
    },
    [loadDirectory],
  );

  const renderEntries = (items: DirEntry[], depth: number): React.ReactNode => {
    return items.map((entry) => (
      <div key={entry.path}>
        <FileTreeItem
          entry={entry}
          depth={depth}
          isExpanded={expanded.has(entry.path)}
          onToggle={() => handleToggle(entry.path)}
          onSelect={() => onFileSelect(entry.path)}
        />
        {entry.isDir &&
          expanded.has(entry.path) &&
          childrenCache[entry.path] &&
          renderEntries(childrenCache[entry.path], depth + 1)}
      </div>
    ));
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return <div className={styles.tree}>{renderEntries(entries, 0)}</div>;
}
