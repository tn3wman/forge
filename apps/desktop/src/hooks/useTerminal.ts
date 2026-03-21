import { useEffect, useRef, useState, type RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { listen } from '@tauri-apps/api/event';
import { ptyIpc } from '../ipc/pty';
import type { PtyDataEvent, PtyExitEvent } from '@forge/core';

export function useTerminal(
  terminalId: string | null,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [isExited, setIsExited] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    if (!terminalId || !containerRef.current) return;

    const term = new Terminal({
      theme: { background: '#1a1a2e', foreground: '#e0e0e0', cursor: '#e0e0e0' },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;
    fitRef.current = fitAddon;

    const onDataDisposable = term.onData((data) => {
      ptyIpc.write(terminalId, data);
    });

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        ptyIpc.resize(terminalId, cols, rows);
      }, 100);
    });

    const dataEventName = `pty:data:${terminalId}`;
    const dataUnlisten = listen<PtyDataEvent>(dataEventName, (event) => {
      const bytes = Uint8Array.from(atob(event.payload.data), (c) => c.charCodeAt(0));
      term.write(bytes);
    });

    const exitEventName = `pty:exit:${terminalId}`;
    const exitUnlisten = listen<PtyExitEvent>(exitEventName, (event) => {
      setIsExited(true);
      setExitCode(event.payload.exitCode);
    });

    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitAddon.fit();
      }, 100);
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      dataUnlisten.then((fn) => fn());
      exitUnlisten.then((fn) => fn());
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [terminalId, containerRef]);

  return { terminal: termRef.current, isExited, exitCode };
}
