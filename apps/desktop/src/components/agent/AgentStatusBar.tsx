import { Brain, Wrench, Check, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentState } from "@forge/shared";

interface AgentStatusBarProps {
  state: AgentState;
  model?: string;
  totalCost: number;
}

const stateConfig: Record<AgentState, { label: string; icon: typeof Check; spin?: boolean }> = {
  idle: { label: "Ready", icon: Check },
  thinking: { label: "Thinking", icon: Brain, spin: true },
  executing: { label: "Executing", icon: Wrench, spin: true },
  awaiting_approval: { label: "Awaiting Approval", icon: AlertTriangle },
  completed: { label: "Completed", icon: Check },
  error: { label: "Error", icon: AlertTriangle },
};

export function AgentStatusBar({ state, model, totalCost }: AgentStatusBarProps) {
  const { label, icon: Icon, spin } = stateConfig[state] ?? stateConfig.idle;

  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {model && <span className="font-mono">{model}</span>}
        <span className="font-mono">${totalCost.toFixed(4)}</span>
      </div>
    </div>
  );
}
