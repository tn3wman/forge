import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import type { Terminal } from "@xterm/xterm";
import { terminalIpc } from "@/ipc/terminal";

interface TerminalOutputPayload {
  sessionId: string;
  data: number[];
}

interface TerminalExitPayload {
  sessionId: string;
  exitCode: number | null;
}

export function useTerminalSession(
  sessionId: string | null,
  terminal: Terminal | null,
  onExit?: (exitCode: number | null) => void,
) {
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    if (!sessionId || !terminal) return;

    const disposables: Array<{ dispose: () => void }> = [];
    const unlisteners: Array<Promise<() => void>> = [];

    unlisteners.push(
      listen<TerminalOutputPayload>("terminal-output", (event) => {
        if (event.payload.sessionId === sessionId) {
          terminal.write(new Uint8Array(event.payload.data));
        }
      }),
    );

    unlisteners.push(
      listen<TerminalExitPayload>("terminal-exit", (event) => {
        if (event.payload.sessionId === sessionId) {
          terminal.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
          onExitRef.current?.(event.payload.exitCode);
        }
      }),
    );

    disposables.push(
      terminal.onData((data) => {
        const bytes = Array.from(new TextEncoder().encode(data));
        terminalIpc.write(sessionId, bytes).catch(() => {});
      }),
    );

    disposables.push(
      terminal.onResize(({ cols, rows }) => {
        terminalIpc.resize(sessionId, cols, rows).catch(() => {});
      }),
    );

    return () => {
      disposables.forEach((d) => d.dispose());
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [sessionId, terminal]);
}
