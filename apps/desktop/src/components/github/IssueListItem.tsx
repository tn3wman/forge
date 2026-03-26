import { CircleDot, CheckCircle2 } from "lucide-react";
import type { Issue } from "@forge/shared";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/common/TimeAgo";

function IssueStatusIcon({ state }: { state: Issue["state"] }) {
  if (state === "closed") {
    return <CheckCircle2 className="h-4 w-4 text-purple-400" />;
  }
  return <CircleDot className="h-4 w-4 text-green-400" />;
}

function LabelPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
      {label}
    </span>
  );
}

interface IssueListItemProps {
  issue: Issue;
  onClick?: () => void;
}

export function IssueListItem({ issue, onClick }: IssueListItemProps) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer"
      onClick={onClick}
    >
      <IssueStatusIcon state={issue.state} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{issue.title}</span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            #{issue.number}
          </span>
        </div>
        {issue.labels.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            {issue.labels.slice(0, 3).map((label) => (
              <LabelPill key={label} label={label} />
            ))}
            {issue.labels.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{issue.labels.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {issue.assignees.length > 0 && (
        <div className="flex items-center -space-x-1.5 shrink-0">
          {issue.assignees.slice(0, 3).map((assignee) => (
            <Avatar key={assignee} className="h-5 w-5 border border-background">
              <AvatarFallback className="text-[9px]">
                {assignee.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {issue.assignees.length > 3 && (
            <span className="text-[10px] text-muted-foreground ml-1.5">
              +{issue.assignees.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        <Avatar className="h-5 w-5">
          <AvatarImage src={issue.authorAvatarUrl} alt={issue.authorLogin} />
          <AvatarFallback className="text-[9px]">
            {issue.authorLogin.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground">{issue.authorLogin}</span>
      </div>

      <TimeAgo date={issue.updatedAt} />
    </div>
  );
}
