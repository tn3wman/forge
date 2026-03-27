import { useEffect, useRef, useState } from "react";
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

export function TerminalView({ sessionId, isActive, alwaysVisible, onExit }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
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

    if (containerRef.current) {
      term.open(containerRef.current);
      try { term.loadAddon(new WebglAddon()); } catch { /* fallback to canvas */ }
      fitAddon.fit();
    }

    setTerminal(term);
    return () => { term.dispose(); };
  }, []);

  useTerminalSession(sessionId, terminal, onExit);

  useEffect(() => {
    if (!containerRef.current || !fitAddonRef.current) return;
    const observer = new ResizeObserver(() => {
      try { fitAddonRef.current?.fit(); } catch { /* ignore */ }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
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
}
