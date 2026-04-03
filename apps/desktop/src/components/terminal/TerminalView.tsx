import { memo, useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { useTerminalSession } from "@/hooks/useTerminalSession";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface TerminalViewProps {
  sessionId: string;
  isActive: boolean;
  alwaysVisible?: boolean;
  onExit?: (exitCode: number | null) => void;
}

export const TerminalView = memo(function TerminalView({ sessionId, isActive, alwaysVisible, onExit }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      scrollback: 5000,
      fontSize: 13,
      fontFamily: "'Geist Mono', 'SF Mono', 'Monaco', 'Menlo', monospace",
      theme: {
        background: "#09090b",
        foreground: "#fafafa",
        cursor: "#fafafa",
        selectionBackground: "#27272a",
        black: "#09090b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#fafafa",
        brightBlack: "#71717a",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(container);

    // Wait one frame for layout to stabilize before fitting and loading WebGL.
    // Defer setTerminal so useTerminalSession doesn't attach listeners until
    // the terminal is properly sized — early PTY output buffers in Tauri events.
    const rafId = requestAnimationFrame(() => {
      fitAddon.fit();
      try { term.loadAddon(new WebglAddon()); } catch { /* fallback to canvas */ }
      setTerminal(term);
    });

    return () => {
      cancelAnimationFrame(rafId);
      term.dispose();
    };
  }, []);

  useTerminalSession(sessionId, terminal, onExit);

  useEffect(() => {
    const container = containerRef.current;
    const fitAddon = fitAddonRef.current;
    if (!container || !fitAddon) return;

    let rafId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        try { fitAddon.fit(); } catch { /* ignore */ }
        rafId = null;
      });
    });

    observer.observe(container);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  // Refit terminal when it becomes active or when home page becomes visible
  const isHomePage = useWorkspaceStore((s) => s.activePage === "home");
  useEffect(() => {
    if (isActive && isHomePage) {
      const id = requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        terminal?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isActive, isHomePage, terminal]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: alwaysVisible || isActive ? "block" : "none" }}
    />
  );
});
