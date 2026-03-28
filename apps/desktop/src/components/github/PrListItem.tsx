import {
  GitPullRequest,
  GitMerge,
  GitPullRequestClosed,
  GitPullRequestDraft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Minus,
  Link2,
} from "lucide-react";
import type { PullRequest } from "@forge/shared";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/common/TimeAgo";

function PrStatusIcon({ pr }: { pr: PullRequest }) {
  if (pr.draft) {
    return <GitPullRequestDraft className="h-4 w-4 text-muted-foreground" />;
  }
  switch (pr.state) {
    case "merged":
      return <GitMerge className="h-4 w-4 text-purple-400" />;
    case "closed":
      return <GitPullRequestClosed className="h-4 w-4 text-red-400" />;
    case "open":
    default:
      return <GitPullRequest className="h-4 w-4 text-green-400" />;
  }
}

function ReviewBadge({ decision }: { decision: string | null }) {
  if (!decision) return null;

  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    APPROVED: {
      label: "Approved",
      className: "bg-green-500/15 text-green-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    CHANGES_REQUESTED: {
      label: "Changes",
      className: "bg-red-500/15 text-red-400",
      icon: <XCircle className="h-3 w-3" />,
    },
    REVIEW_REQUIRED: {
      label: "Review",
      className: "bg-yellow-500/15 text-yellow-400",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

  const c = config[decision];
  if (!c) return null;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap", c.className)}>
      {c.icon}
      {c.label}
    </span>
  );
}

interface PrListItemProps {
  pr: PullRequest;
  onClick?: () => void;
}

export function PrListItem({ pr, onClick }: PrListItemProps) {
  const { navigateToIssue } = useWorkspaceStore();

  return (
    <div
      className="flex items-center h-10 gap-2 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer"
      onClick={onClick}
    >
      {/* Status icon */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <PrStatusIcon pr={pr} />
      </div>

      {/* PR number */}
      <div className="w-[50px] shrink-0">
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          #{pr.number}
        </span>
      </div>

      {/* Title (flexible) */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{pr.title}</span>
      </div>

      {/* Review status */}
      <div className="shrink-0">
        <ReviewBadge decision={pr.reviewDecision} />
      </div>

      {/* Diff stats */}
      <div className="w-[100px] shrink-0 flex items-center gap-1 text-xs tabular-nums">
        <Plus className="h-3 w-3 text-green-400" />
        <span className="text-green-400">{pr.additions}</span>
        <Minus className="h-3 w-3 text-red-400 ml-1" />
        <span className="text-red-400">{pr.deletions}</span>
      </div>

      {/* Linked issues */}
      <div className="w-[120px] shrink-0 flex items-center gap-1">
        {pr.linkedIssues && pr.linkedIssues.length > 0 && (
          <>
            {pr.linkedIssues.slice(0, 2).map((issue) => (
              <button
                key={issue.number}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-mono transition-colors",
                  issue.state === "closed"
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                    : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (pr.repoFullName) navigateToIssue(pr.repoFullName, issue.number);
                }}
              >
                <Link2 className="h-3 w-3" />
                #{issue.number}
              </button>
            ))}
            {pr.linkedIssues.length > 2 && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                +{pr.linkedIssues.length - 2}
              </span>
            )}
          </>
        )}
      </div>

      {/* Author */}
      <div className="w-[100px] shrink-0 flex items-center gap-1.5 justify-end overflow-hidden">
        <span className="text-xs text-muted-foreground truncate">{pr.authorLogin}</span>
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={pr.authorAvatarUrl} alt={pr.authorLogin} />
          <AvatarFallback className="text-[9px]">
            {pr.authorLogin.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Updated */}
      <div className="w-[55px] shrink-0 text-right">
        <TimeAgo date={pr.updatedAt} />
      </div>
    </div>
  );
}
