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
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", c.className)}>
      {c.icon}
      {c.label}
    </span>
  );
}

function LabelPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
      {label}
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
      className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer"
      onClick={onClick}
    >
      <PrStatusIcon pr={pr} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{pr.title}</span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            #{pr.number}
          </span>
          <ReviewBadge decision={pr.reviewDecision} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {pr.labels.length > 0 && (
            <div className="flex items-center gap-1">
              {pr.labels.slice(0, 3).map((label) => (
                <LabelPill key={label} label={label} />
              ))}
              {pr.labels.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{pr.labels.length - 3}
                </span>
              )}
            </div>
          )}
          {pr.linkedIssues && pr.linkedIssues.length > 0 && (
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              {pr.linkedIssues.slice(0, 3).map((issue) => (
                <button
                  key={issue.number}
                  className={cn(
                    "text-[10px] font-mono hover:underline",
                    issue.state === "closed" ? "text-purple-400" : "text-green-400"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pr.repoFullName) navigateToIssue(pr.repoFullName, issue.number);
                  }}
                >
                  #{issue.number}
                </button>
              ))}
              {pr.linkedIssues.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{pr.linkedIssues.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs tabular-nums shrink-0">
        <Plus className="h-3 w-3 text-green-400" />
        <span className="text-green-400">{pr.additions}</span>
        <Minus className="h-3 w-3 text-red-400 ml-1" />
        <span className="text-red-400">{pr.deletions}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Avatar className="h-5 w-5">
          <AvatarImage src={pr.authorAvatarUrl} alt={pr.authorLogin} />
          <AvatarFallback className="text-[9px]">
            {pr.authorLogin.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground">{pr.authorLogin}</span>
      </div>

      <TimeAgo date={pr.updatedAt} />
    </div>
  );
}
