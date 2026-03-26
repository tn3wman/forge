import { useCallback, useRef } from "react";
import { Plus, GripHorizontal } from "lucide-react";
import { useTerminalStore } from "@/stores/terminalStore";
import { TerminalTab } from "./TerminalTab";
import { TerminalView } from "./TerminalView";
import { terminalIpc } from "@/ipc/terminal";

interface TerminalPanelProps {
  onNewTerminal: () => void;
}

export function TerminalPanel({ onNewTerminal }: TerminalPanelProps) {
  const { tabs, activeTabId, panelHeight, setActiveTab, removeTab, setPanelHeight } =
    useTerminalStore();
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleCloseTab = useCallback(
    (sessionId: string) => {
      terminalIpc.kill(sessionId).catch(() => {});
      removeTab(sessionId);
    },
    [removeTab],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startHeight: panelHeight };
      const handleMouseMove = (e: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startY - e.clientY;
        setPanelHeight(dragRef.current.startHeight + delta);
      };
      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [panelHeight, setPanelHeight],
  );

  return (
    <div className="flex flex-col border-t" style={{ height: panelHeight }}>
      <div
        onMouseDown={handleMouseDown}
        className="flex h-1 cursor-ns-resize items-center justify-center hover:bg-accent"
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground/50" />
      </div>
      <div className="flex h-8 items-center border-b bg-sidebar/50 px-1">
        <div className="flex flex-1 items-center overflow-x-auto">
          {tabs.map((tab) => (
            <TerminalTab
              key={tab.sessionId}
              tab={tab}
              isActive={tab.sessionId === activeTabId}
              onSelect={() => setActiveTab(tab.sessionId)}
              onClose={() => handleCloseTab(tab.sessionId)}
            />
          ))}
        </div>
        <button
          onClick={onNewTerminal}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <TerminalView
            key={tab.sessionId}
            sessionId={tab.sessionId}
            isActive={tab.sessionId === activeTabId}
          />
        ))}
        {tabs.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No terminals open
          </div>
        )}
      </div>
    </div>
  );
}
