import { useState } from "react";
import { CheckCircle2, XCircle, Circle, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusCheck } from "@forge/shared";

interface StatusChecksProps {
  checks: StatusCheck[];
}

const STATUS_ICON: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  SUCCESS: { icon: CheckCircle2, color: "text-green-400" },
  FAILURE: { icon: XCircle, color: "text-red-400" },
  ERROR: { icon: XCircle, color: "text-red-400" },
  PENDING: { icon: Circle, color: "text-yellow-400" },
  NEUTRAL: { icon: Circle, color: "text-muted-foreground" },
};

export function StatusChecks({ checks }: StatusChecksProps) {
  const [expanded, setExpanded] = useState(false);

  if (!checks.length) return null;

  const passed = checks.filter((c) => c.status === "SUCCESS").length;
  const failed = checks.filter(
    (c) => c.status === "FAILURE" || c.status === "ERROR",
  ).length;
  const total = checks.length;
  const allPassed = passed === total;

  const SummaryIcon = allPassed ? CheckCircle2 : failed > 0 ? XCircle : Circle;
  const summaryColor = allPassed
    ? "text-green-400"
    : failed > 0
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="rounded-md border border-border">
      {/* Summary */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
      >
        <SummaryIcon className={cn("h-4 w-4", summaryColor)} />
        <span className="text-foreground">
          {passed}/{total} checks passed
        </span>
        <ChevronRight
          className={cn(
            "ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {/* Details */}
      {expanded && (
        <div className="border-t border-border">
          {checks.map((check) => (
            <CheckRow key={check.name} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: StatusCheck }) {
  const { icon: Icon, color } =
    STATUS_ICON[check.status] ?? STATUS_ICON.NEUTRAL;

  const handleClick = async () => {
    if (!check.url) return;
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(check.url);
    } catch {
      // Fallback or ignore if not in Tauri context
      window.open(check.url, "_blank");
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
      <span
        className={cn(
          "truncate font-medium",
          check.url
            ? "cursor-pointer text-foreground hover:underline"
            : "text-foreground",
        )}
        onClick={check.url ? handleClick : undefined}
      >
        {check.name}
      </span>
      {check.url && (
        <ExternalLink
          className="h-3 w-3 shrink-0 text-muted-foreground cursor-pointer"
          onClick={handleClick}
        />
      )}
      {check.description && (
        <span className="ml-auto truncate text-muted-foreground">
          {check.description}
        </span>
      )}
    </div>
  );
}
