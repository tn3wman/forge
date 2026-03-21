import { useEffect, useRef, useCallback, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { FsChangeEvent } from '@forge/core';
import { fsIpc } from '../ipc';

export function useFileWatcher(bayId: string | null, projectPath: string | null) {
  const [refreshKey, setRefreshKey] = useState(0);
  const unlistenRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!bayId || !projectPath) return;

    fsIpc.startWatcher(bayId, projectPath);

    listen<FsChangeEvent>('fs-change', () => {
      refresh();
    }).then((unlisten) => {
      unlistenRef.current = unlisten;
    });

    return () => {
      fsIpc.stopWatcher(bayId);
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [bayId, projectPath, refresh]);

  return refreshKey;
}
