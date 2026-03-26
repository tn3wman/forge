import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  GitPullRequest,
  CircleDot,
  Tag,
  MessageSquare,
  GitCommitHorizontal,
} from "lucide-react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
} from "@/queries/useNotifications";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { TimeAgo } from "@/components/common/TimeAgo";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/ipc/notifications";

const REASON_LABELS: Record<string, string> = {
  assign: "Assigned",
  author: "Author",
  comment: "Comment",
  mention: "Mentioned",
  review_requested: "Review requested",
  state_change: "State changed",
  subscribed: "Subscribed",
  team_mention: "Team mentioned",
};

function subjectIcon(type: string) {
  switch (type) {
    case "PullRequest":
      return GitPullRequest;
    case "Issue":
      return CircleDot;
    case "Release":
      return Tag;
    case "Commit":
      return GitCommitHorizontal;
    case "Discussion":
      return MessageSquare;
    default:
      return Bell;
  }
}

function extractNumber(url: string | null): number | null {
  if (!url) return null;
  const match = url.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export function Notifications() {
  const [showAll, setShowAll] = useState(false);
  const { data: notifications, isLoading } = useNotifications(showAll);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const { navigateToPr, navigateToIssue } = useWorkspaceStore();

  function handleClick(n: NotificationItem) {
    const number = extractNumber(n.subjectUrl);
    if (number == null) return;
    if (n.subjectType === "PullRequest") {
      navigateToPr(n.repoFullName, number);
    } else if (n.subjectType === "Issue") {
      navigateToIssue(n.repoFullName, number);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <div className="flex rounded-md border">
          <button
            onClick={() => setShowAll(false)}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors rounded-l-md",
              !showAll
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Unread
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors rounded-r-md",
              showAll
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </button>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {!notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bell className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => {
              const Icon = subjectIcon(n.subjectType);
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleClick(n)}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      n.unread ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm truncate",
                        n.unread && "font-semibold",
                      )}
                    >
                      {n.subjectTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">
                        {n.repoFullName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {REASON_LABELS[n.reason] ?? n.reason}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <TimeAgo date={n.updatedAt} />
                      </span>
                    </div>
                  </div>
                  {n.unread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate(n.id);
                      }}
                      className="mt-0.5 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
