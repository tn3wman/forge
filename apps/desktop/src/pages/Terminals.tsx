import { useCallback } from "react";
import { Plus, LayoutGrid, Columns, Layers, X } from "lucide-react";
import { Terminal as TerminalIcon, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTerminalStore, type TerminalLayoutMode } from "@/stores/terminalStore";
import { TerminalTab } from "@/components/terminal/TerminalTab";
import { TerminalView } from "@/components/terminal/TerminalView";
import { ChatView } from "@/components/agent/ChatView";
import { terminalIpc } from "@/ipc/terminal";
import { agentIpc } from "@/ipc/agent";

const LAYOUT_OPTIONS: { mode: TerminalLayoutMode; icon: typeof LayoutGrid; label: string }[] = [
  { mode: "tabs", icon: Layers, label: "Tabs" },
  { mode: "grid", icon: LayoutGrid, label: "Grid" },
  { mode: "horizontal-scroll", icon: Columns, label: "Columns" },
];

function computeGridCols(count: number): number {
  if (count <= 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return Math.ceil(Math.sqrt(count));
}

interface TerminalsProps {
  onNewTerminal: () => void;
}

export function Terminals({ onNewTerminal }: TerminalsProps) {
  const { tabs, activeTabId, layoutMode, setLayoutMode, setActiveTab, removeTab } =
    useTerminalStore();

  const handleClose = useCallback(
    (sessionId: string) => {
      const tab = tabs.find((t) => t.sessionId === sessionId);
      if (tab?.type === "chat") {
        agentIpc.kill(sessionId).catch(() => {});
      } else {
        terminalIpc.kill(sessionId).catch(() => {});
      }
      removeTab(sessionId);
    },
    [removeTab, tabs],
  );

  if (tabs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <TerminalIcon className="h-12 w-12 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">No terminal sessions</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Create a new terminal to get started
          </p>
        </div>
        <button
          onClick={onNewTerminal}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Terminal
        </button>
      </div>
    );
  }

  const showCellChrome = layoutMode !== "tabs";

  return (
    <div className="flex h-full flex-col">
      {/* Compact toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-2">
        {/* Layout mode toggle */}
        <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setLayoutMode(opt.mode)}
              title={opt.label}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-sm transition-colors",
                layoutMode === opt.mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <opt.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Tab bar — only in tabs mode */}
        {layoutMode === "tabs" && (
          <div className="flex flex-1 items-center overflow-x-auto">
            {tabs.map((tab) => (
              <TerminalTab
                key={tab.sessionId}
                tab={tab}
                isActive={tab.sessionId === activeTabId}
                onSelect={() => setActiveTab(tab.sessionId)}
                onClose={() => handleClose(tab.sessionId)}
              />
            ))}
          </div>
        )}

        {layoutMode !== "tabs" && (
          <span className="text-xs text-muted-foreground">
            {tabs.length} terminal{tabs.length !== 1 ? "s" : ""}
          </span>
        )}

        <div className="flex-1" />

        <button
          onClick={onNewTerminal}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          title="New Terminal (⌘⇧`)"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Terminal content area — SINGLE render path, never unmounts terminals */}
      <div
        className={cn(
          "flex-1 overflow-hidden",
          layoutMode === "grid" && "grid gap-1 p-1",
          layoutMode === "horizontal-scroll" && "flex gap-1 overflow-x-auto p-1",
        )}
        style={
          layoutMode === "grid"
            ? {
                gridTemplateColumns: `repeat(${computeGridCols(tabs.length)}, 1fr)`,
                gridAutoRows: "1fr",
              }
            : undefined
        }
      >
        {tabs.map((tab) => {
          const isActive = tab.sessionId === activeTabId;

          return (
            <div
              key={tab.sessionId}
              className={cn(
                // Tabs mode: hide inactive, fill active
                layoutMode === "tabs" && !isActive && "hidden",
                layoutMode === "tabs" && isActive && "h-full",
                // Grid mode: each cell fills its grid area
                layoutMode === "grid" && "flex flex-col overflow-hidden rounded-md border min-h-0",
                layoutMode === "grid" && isActive && "ring-1 ring-primary border-primary",
                layoutMode === "grid" && !isActive && "border-border",
                // Horizontal scroll: fixed or proportional width
                layoutMode === "horizontal-scroll" && "h-full flex-shrink-0 flex flex-col overflow-hidden rounded-md border",
                layoutMode === "horizontal-scroll" && isActive && "ring-1 ring-primary border-primary",
                layoutMode === "horizontal-scroll" && !isActive && "border-border",
              )}
              style={
                layoutMode === "horizontal-scroll"
                  ? { width: tabs.length <= 2 ? `${100 / tabs.length}%` : "600px" }
                  : undefined
              }
              onClick={showCellChrome ? () => setActiveTab(tab.sessionId) : undefined}
            >
              {/* Cell header — only in grid/columns modes */}
              {showCellChrome && (
                <div className="flex h-7 shrink-0 items-center gap-2 border-b bg-sidebar/50 px-2">
                  <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
                    {tab.label}
                  </span>
                  {tab.mode !== "Normal" && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      {tab.mode === "Plan" ? "plan" : "yolo"}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose(tab.sessionId);
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                {tab.type === "chat" ? (
                  <ChatView sessionId={tab.sessionId} />
                ) : (
                  <TerminalView
                    sessionId={tab.sessionId}
                    isActive={isActive}
                    alwaysVisible={showCellChrome}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
