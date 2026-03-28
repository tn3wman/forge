import { CircleDot, CheckCircle2, GitPullRequest, Rocket } from "lucide-react";
import type { Issue } from "@forge/shared";
import type { LinkedPrSummary } from "@/hooks/useLinkedItems";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/common/TimeAgo";
import { useWorkspaceStore } from "@/stores/workspaceStore";

function IssueStatusIcon({ state }: { state: Issue["state"] }) {
  if (state === "closed") {
    return <CheckCircle2 className="h-4 w-4 text-purple-400" />;
  }
  return <CircleDot className="h-4 w-4 text-green-400" />;
}

function LabelPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground whitespace-nowrap">
      {label}
    </span>
  );
}

interface IssueListItemProps {
  issue: Issue;
  linkedPrs?: LinkedPrSummary[];
  onClick?: () => void;
  onStartWork?: () => void;
}

export function IssueListItem({ issue, linkedPrs, onClick, onStartWork }: IssueListItemProps) {
  const { navigateToPr } = useWorkspaceStore();

  return (
    <div
      className="flex items-center h-10 gap-2 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer"
      onClick={onClick}
    >
      {/* Left group: icon + number + title (flexible) */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <IssueStatusIcon state={issue.state} />
      </div>

      <div className="w-[50px] shrink-0">
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          #{issue.number}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{issue.title}</span>
      </div>

      {/* Right group: labels and PRs left-aligned in fixed columns */}
      <div className="w-[160px] shrink-0 flex items-center gap-1">
        {issue.labels.slice(0, 3).map((label) => (
          <LabelPill key={label} label={label} />
        ))}
        {issue.labels.length > 3 && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            +{issue.labels.length - 3}
          </span>
        )}
      </div>

      <div className="w-[120px] shrink-0 flex items-center gap-1">
        {linkedPrs && linkedPrs.length > 0 && (
          <>
            {linkedPrs.slice(0, 2).map((pr) => (
              <button
                key={pr.prNumber}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-mono transition-colors",
                  pr.prState === "merged"
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                    : pr.prState === "closed"
                      ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToPr(pr.repoFullName, pr.prNumber);
                }}
              >
                <GitPullRequest className="h-3 w-3" />
                #{pr.prNumber}
              </button>
            ))}
            {linkedPrs.length > 2 && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                +{linkedPrs.length - 2}
              </span>
            )}
          </>
        )}
      </div>

      <div className="w-[100px] shrink-0 flex items-center gap-1.5 justify-end overflow-hidden">
        <span className="text-xs text-muted-foreground truncate">{issue.authorLogin}</span>
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={issue.authorAvatarUrl} alt={issue.authorLogin} />
          <AvatarFallback className="text-[9px]">
            {issue.authorLogin.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="w-[55px] shrink-0 text-right">
        <TimeAgo date={issue.updatedAt} />
      </div>

      <div className="w-8 shrink-0 flex items-center justify-center">
        {issue.state === "open" && onStartWork && (
          <button
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onStartWork();
            }}
            title="Start work on this issue"
          >
            <Rocket className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
