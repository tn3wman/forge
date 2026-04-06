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

    // Synchronous flag to prevent stale listeners from writing after cleanup.
    // The async unlistener promises may resolve late on rapid tab switches,
    // so we guard every callback with this flag.
    let cancelled = false;

    // --- Write batching ---
    // Accumulate incoming chunks and flush once per microtask so that
    // multiple Tauri events delivered in the same JS task become a single
    // xterm.js write, eliminating per-event render passes that cause flicker.
    let pendingChunks: Uint8Array[] = [];
    let flushScheduled = false;

    function enqueueWrite(data: Uint8Array) {
      pendingChunks.push(data);
      if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(() => {
          if (cancelled) return;
          const chunks = pendingChunks;
          pendingChunks = [];
          flushScheduled = false;
          if (chunks.length === 1) {
            terminal!.write(chunks[0]);
          } else {
            const total = chunks.reduce((s, c) => s + c.length, 0);
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }
            terminal!.write(merged);
          }
        });
      }
    }

    // Track whether we've sent the prefill text yet (send once after first output)
    let prefillSent = false;

    unlisteners.push(
      listen<TerminalOutputPayload>("terminal-output", (event) => {
        if (cancelled || event.payload.sessionId !== sessionId) return;
        enqueueWrite(new Uint8Array(event.payload.data));

        // After the first output (shell prompt), type the prefill command
        // into the terminal without pressing Enter so the user can edit or
        // delete it.
        if (!prefillSent && prefill) {
          prefillSent = true;
          const bytes = Array.from(new TextEncoder().encode(prefill));
          terminalIpc.write(sessionId, bytes).catch(() => {});
        }
      }),
    );

    unlisteners.push(
      listen<TerminalExitPayload>("terminal-exit", (event) => {
        if (cancelled || event.payload.sessionId !== sessionId) return;
        terminal.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
        onExitRef.current?.(event.payload.exitCode);
      }),
    );

    // Start the PTY reader thread now that our event listeners are registered.
    // This ensures no output events are lost to the race between PTY emission
    // and listener attachment.
    terminalIpc.attach(sessionId).catch(() => {});

    disposables.push(
      terminal.onData((data) => {
        if (cancelled) return;
        const bytes = Array.from(new TextEncoder().encode(data));
        terminalIpc.write(sessionId, bytes).catch(() => {});
      }),
    );

    disposables.push(
      terminal.onResize(({ cols, rows }) => {
        if (cancelled) return;
        terminalIpc.resize(sessionId, cols, rows).catch(() => {});
      }),
    );

    return () => {
      cancelled = true;
      disposables.forEach((d) => d.dispose());
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [sessionId, terminal]);
}
