import { useCallback, useEffect, Component, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { Plus, LayoutGrid, Columns, Layers, X, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTerminalStore, type TerminalLayoutMode } from "@/stores/terminalStore";
import { useAgentStore } from "@/stores/agentStore";
import { TerminalTab } from "@/components/terminal/TerminalTab";
import { TerminalView } from "@/components/terminal/TerminalView";
import { ChatView } from "@/components/agent/ChatView";
import { ClaudeChatView } from "@/components/agent/ClaudeChatView";
import { PreSessionView } from "@/components/agent/PreSessionView";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { terminalIpc } from "@/ipc/terminal";
import { agentIpc } from "@/ipc/agent";
import { CommitPushButton } from "@/components/terminal/CommitPushButton";

class ChatErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          <p className="text-sm font-medium text-foreground">Chat session crashed</p>
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const { tabs: allTabs, activeTabId, layoutMode, setLayoutMode, setActiveTab, removeTab } =
    useTerminalStore();
  const agentTabs = useAgentStore(
    useShallow((s) => s.tabs.map((t) => ({
      sessionId: t.sessionId,
      state: t.state,
      provider: t.provider,
      cliName: t.cliName,
    }))),
  );
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const tabs = allTabs.filter((t) => t.workspaceId === activeWorkspaceId);

  // Auto-select first workspace tab when activeTabId is not in filtered set
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.tabId === activeTabId)) {
      setActiveTab(tabs[0].tabId);
    }
  }, [tabs, activeTabId, setActiveTab]);

  const handleClose = useCallback(
    (tabId: string) => {
      // Read tabs from store directly to avoid depending on the filtered `tabs`
      // array, which changes reference on every render and would invalidate this
      // callback (cascading re-renders to all TerminalTab children).
      const allTermTabs = useTerminalStore.getState().tabs;
      const tab = allTermTabs.find((t) => t.tabId === tabId);
      if (tab && tab.status === "active" && tab.sessionId) {
        if (tab.type === "chat") {
          agentIpc.kill(tab.sessionId).catch(() => {});
          agentIpc.deletePersistedSession(tab.sessionId).catch(() => {});
          useAgentStore.getState().removeTab(tab.sessionId);
        } else {
          terminalIpc.kill(tab.sessionId).catch(() => {});
        }
      }
      removeTab(tabId);
    },
    [removeTab],
  );

  if (tabs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">No sessions</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Start a new agent to get going
          </p>
        </div>
        <button
          onClick={onNewTerminal}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Agent
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
                key={tab.tabId}
                tab={tab}
                isActive={tab.tabId === activeTabId}
                onSelect={setActiveTab}
                onClose={handleClose}
              />
            ))}
          </div>
        )}

        {layoutMode !== "tabs" && (
          <span className="text-xs text-muted-foreground">
            {tabs.length} session{tabs.length !== 1 ? "s" : ""}
          </span>
        )}

        <div className="flex-1" />

        <CommitPushButton />

        <button
          onClick={onNewTerminal}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          title="New Agent (⌘⇧`)"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content area — SINGLE render path, never unmounts terminals */}
      <div
        className={cn(
          "flex-1 overflow-hidden relative",
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
          const isActive = tab.tabId === activeTabId;
          const agentTab =
            tab.type === "chat" && tab.sessionId
              ? agentTabs.find((entry) => entry.sessionId === tab.sessionId)
              : undefined;
          const agentState = agentTab?.state;
          const isAgentRunning =
            agentState === "thinking" ||
            agentState === "executing" ||
            agentState === "awaiting_approval";

          return (
            <div
              key={tab.tabId}
              className={cn(
                // Tabs mode: absolute fill, flex column for child stretching, hide inactive
                layoutMode === "tabs" && "absolute inset-0 flex flex-col",
                layoutMode === "tabs" && !isActive && "invisible",
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
              onClick={showCellChrome ? () => setActiveTab(tab.tabId) : undefined}
            >
              {/* Cell header — only in grid/columns modes */}
              {showCellChrome && (
                <div className="flex h-7 shrink-0 items-center gap-2 border-b bg-sidebar/50 px-2">
                  <span className="flex-1 truncate text-xs font-medium text-muted-foreground">
                    {tab.label}
                  </span>
                  {isAgentRunning && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                  {tab.mode !== "Normal" && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      {tab.mode === "Plan" ? "plan" : "yolo"}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose(tab.tabId);
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                {tab.status === "pre-session" ? (
                  <PreSessionView tabId={tab.tabId} workspaceId={tab.workspaceId} />
                ) : tab.type === "chat" ? (
                  <ChatErrorBoundary>
                    {agentTab?.provider === "claude" || tab.cliName === "claude" ? (
                      <ClaudeChatView sessionId={tab.sessionId!} />
                    ) : (
                      <ChatView sessionId={tab.sessionId!} />
                    )}
                  </ChatErrorBoundary>
                ) : (
                  <TerminalView
                    sessionId={tab.sessionId!}
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
