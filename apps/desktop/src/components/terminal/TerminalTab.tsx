import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TerminalTab as TerminalTabType } from "@/stores/terminalStore";

interface TerminalTabProps {
  tab: TerminalTabType;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export function TerminalTab({ tab, isActive, onSelect, onClose }: TerminalTabProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex h-8 items-center gap-1.5 border-b-2 px-3 text-xs transition-colors",
        isActive
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="truncate max-w-[120px]">{tab.label}</span>
      <span
        role="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent"
      >
        <X className="h-3 w-3" />
      </span>
    </button>
  );
}
