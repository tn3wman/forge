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
  prefill?: string,
  onExit?: (exitCode: number | null) => void,
) {
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    if (!sessionId || !terminal) return;

    const disposables: Array<{ dispose: () => void }> = [];
    const unlisteners: Array<Promise<() => void>> = [];

    // Track whether we've sent the prefill text yet (send once after first output)
    let prefillSent = false;

    unlisteners.push(
      listen<TerminalOutputPayload>("terminal-output", (event) => {
        if (event.payload.sessionId === sessionId) {
          terminal.write(new Uint8Array(event.payload.data));

          // After the first output (shell prompt), type the prefill command
          // into the terminal without pressing Enter so the user can edit or
          // delete it.
          if (!prefillSent && prefill) {
            prefillSent = true;
            const bytes = Array.from(new TextEncoder().encode(prefill));
            terminalIpc.write(sessionId, bytes).catch(() => {});
          }
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

    // Start the PTY reader thread now that our event listeners are registered.
    // This ensures no output events are lost to the race between PTY emission
    // and listener attachment.
    terminalIpc.attach(sessionId).catch(() => {});

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
