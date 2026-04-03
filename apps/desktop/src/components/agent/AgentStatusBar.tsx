import { Brain, Wrench, Check, AlertTriangle, Dot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentState } from "@forge/shared";

interface AgentStatusBarProps {
  state: AgentState;
  model?: string;
  permissionMode?: string | null;
  agent?: string | null;
  effort?: string | null;
  conversationId?: string | null;
  totalCost: number;
  planMode?: boolean;
}

const stateConfig: Record<AgentState, { label: string; icon: typeof Check; spin?: boolean }> = {
  idle: { label: "Ready", icon: Check },
  thinking: { label: "Thinking", icon: Brain, spin: true },
  executing: { label: "Executing", icon: Wrench, spin: true },
  awaiting_approval: { label: "Awaiting Approval", icon: AlertTriangle },
  completed: { label: "Completed", icon: Check },
  error: { label: "Error", icon: AlertTriangle },
};

const PERMISSION_LABELS: Record<string, string> = {
  supervised: "Supervised",
  assisted: "Assisted",
  fullAccess: "Full Access",
};

const EFFORT_LABELS: Record<string, string> = {
  low: "Low effort",
  medium: "Medium effort",
  high: "High effort",
};

function formatModel(model: string): string {
  return model
    .replace("claude-", "Claude ")
    .replace("opus-4-6", "Opus 4.6")
    .replace("sonnet-4-6", "Sonnet 4.6")
    .replace("haiku-4-5", "Haiku 4.5")
    .replace("[1m]", "")
    .replace("[1M]", "")
    .replace(/\[.*?\]$/, "")
    .trim();
}

export function AgentStatusBar({
  state,
  model,
  permissionMode,
  agent,
  effort,
  totalCost,
  planMode,
}: AgentStatusBarProps) {
  const config = stateConfig[state] ?? stateConfig.idle;
  const label = planMode && state === "awaiting_approval" ? "Plan Ready for Review" : config.label;
  const { icon: Icon, spin } = config;

  const details: string[] = [];
  if (planMode) details.push("Plan");
  if (model) details.push(formatModel(model));
  if (permissionMode) details.push(PERMISSION_LABELS[permissionMode] ?? permissionMode);
  if (agent) details.push(agent);
  if (effort) details.push(EFFORT_LABELS[effort] ?? effort);

  return (
    <div className="mx-4 mb-1.5 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} />
        <span>{label}</span>
        {details.length > 0 && (
          <>
            <Dot className="h-4 w-4 text-muted-foreground/40" />
            <span>{details.join(" \u00b7 ")}</span>
          </>
        )}
      </div>
      <span className="font-mono tabular-nums">${(totalCost ?? 0).toFixed(4)}</span>
    </div>
  );
}
