import { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { lspIpc } from '../ipc';
import type { LspDiagnostic, LspDiagnosticsEvent } from '@forge/core';

export function useLsp(bayId: string | null, projectPath: string | null) {
  const [diagnostics, setDiagnostics] = useState<Map<string, LspDiagnostic[]>>(new Map());
  const startedRef = useRef(false);

  useEffect(() => {
    if (!bayId || !projectPath) return;

    // Start TypeScript language server by default
    const languageId = 'typescript';

    lspIpc
      .start(bayId, languageId, projectPath)
      .then(() => {
        startedRef.current = true;
      })
      .catch(() => {
        // Language server not available — gracefully degrade
      });

    const unlistenPromise = listen<LspDiagnosticsEvent>('lsp:diagnostics', (event) => {
      if (event.payload.bayId !== bayId) return;
      setDiagnostics((prev) => {
        const next = new Map(prev);
        next.set(event.payload.uri, event.payload.diagnostics);
        return next;
      });
    });

    return () => {
      lspIpc.stopAll(bayId).catch(() => {});
      unlistenPromise.then((fn) => fn());
      startedRef.current = false;
    };
  }, [bayId, projectPath]);

  const didOpen = useCallback(
    (uri: string, languageId: string, text: string) => {
      if (!bayId || !startedRef.current) return;
      lspIpc.didOpen(bayId, languageId, uri, text).catch(() => {});
    },
    [bayId],
  );

  const didChange = useCallback(
    (uri: string, languageId: string, version: number, text: string) => {
      if (!bayId || !startedRef.current) return;
      lspIpc.didChange(bayId, languageId, uri, version, text).catch(() => {});
    },
    [bayId],
  );

  return { diagnostics, didOpen, didChange };
}
