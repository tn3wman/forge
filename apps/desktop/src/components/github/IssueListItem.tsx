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
    <span className="inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground truncate max-w-[65px]">
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
      className="flex items-center h-10 gap-3 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer"
      onClick={onClick}
    >
      {/* Status icon */}
      <div className="w-6 shrink-0 flex items-center justify-center">
        <IssueStatusIcon state={issue.state} />
      </div>

      {/* Title + number */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium truncate">{issue.title}</span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          #{issue.number}
        </span>
      </div>

      {/* Labels */}
      <div className="w-[140px] shrink-0 flex items-center gap-1 overflow-hidden">
        {issue.labels.slice(0, 2).map((label) => (
          <LabelPill key={label} label={label} />
        ))}
        {issue.labels.length > 2 && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            +{issue.labels.length - 2}
          </span>
        )}
      </div>

      {/* Linked PRs */}
      <div className="w-[80px] shrink-0 flex items-center gap-1 overflow-hidden">
        {linkedPrs && linkedPrs.length > 0 && (
          <>
            <GitPullRequest className="h-3 w-3 text-muted-foreground shrink-0" />
            {linkedPrs.slice(0, 2).map((pr) => (
              <button
                key={pr.prNumber}
                className={cn(
                  "text-[10px] font-mono hover:underline shrink-0",
                  pr.prState === "merged"
                    ? "text-purple-400"
                    : pr.prState === "closed"
                      ? "text-red-400"
                      : "text-green-400",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToPr(pr.repoFullName, pr.prNumber);
                }}
              >
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

      {/* Author */}
      <div className="w-[100px] shrink-0 flex items-center gap-1.5 overflow-hidden">
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={issue.authorAvatarUrl} alt={issue.authorLogin} />
          <AvatarFallback className="text-[9px]">
            {issue.authorLogin.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground truncate">{issue.authorLogin}</span>
      </div>

      {/* Updated */}
      <div className="w-[70px] shrink-0">
        <TimeAgo date={issue.updatedAt} />
      </div>

      {/* Start work button */}
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
