import { useState, useMemo } from "react";
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
import { useRepositories } from "@/queries/useRepositories";
import { useWorkspaceTint } from "@/hooks/useWorkspaceTint";
import { TimeAgo } from "@/components/common/TimeAgo";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/ipc/notifications";

const REASON_LABELS: Record<string, string> = {
  assign: "Assigned",
  author: "Author",
  comment: "Comment",
  mention: "Mentioned",
  review_requested: "Review",
  state_change: "Changed",
  subscribed: "Subscribed",
  team_mention: "Team",
};

const NOTIF_FILTERS = [
  { value: "unread", label: "Unread" },
  { value: "all", label: "All" },
] as const;

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
  const [activeFilter, setActiveFilter] = useState("unread");
  const showAll = activeFilter === "all";
  const { data: allNotifications, isLoading } = useNotifications(showAll);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const { navigateToPr, navigateToIssue, activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const tintStyle = useWorkspaceTint();

  const workspaceRepoNames = useMemo(
    () => new Set(repos?.map((r) => r.fullName.toLowerCase()) ?? []),
    [repos],
  );

  const notifications = useMemo(() => {
    if (!allNotifications) return undefined;
    if (workspaceRepoNames.size === 0) return allNotifications;
    return allNotifications.filter((n) => workspaceRepoNames.has(n.repoFullName.toLowerCase()));
  }, [allNotifications, workspaceRepoNames]);

  const filterCounts = useMemo(() => {
    return {
      unread: notifications?.filter((n) => n.unread).length ?? 0,
      all: notifications?.length ?? 0,
    };
  }, [notifications]);

  function handleClick(n: NotificationItem) {
    const number = extractNumber(n.subjectUrl);
    if (number == null) return;
    if (n.subjectType === "PullRequest") {
      navigateToPr(n.repoFullName, number);
    } else if (n.subjectType === "Issue") {
      navigateToIssue(n.repoFullName, number);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Title bar with filters */}
      <div
        className="relative flex shrink-0 items-center gap-2 border-b border-border px-4 h-8"
        data-tauri-drag-region
        style={tintStyle}
      >
        {NOTIF_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors shrink-0",
              activeFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground hover:bg-accent/80",
            )}
          >
            {f.label}
            <span className="ml-1 opacity-70">{filterCounts[f.value as keyof typeof filterCounts]}</span>
          </button>
        ))}

        <div className="flex-1" data-tauri-drag-region />

        <button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80 transition-colors shrink-0"
        >
          <CheckCheck className="h-3 w-3" />
          Mark all read
        </button>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Loading notifications...</p>
          </div>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bell className="mb-3 h-8 w-8 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        )}

        {notifications?.map((n) => {
          const Icon = subjectIcon(n.subjectType);
          return (
            <div
              key={n.id}
              className="flex items-center h-10 gap-2 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer"
              onClick={() => handleClick(n)}
            >
              {/* Icon + number column — matches Issues/PRs width */}
              <div className="w-5 shrink-0 flex items-center justify-center">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    n.unread ? "text-green-400" : "text-muted-foreground",
                  )}
                />
              </div>

              <div className="w-[50px] shrink-0" />

              {/* Title (flexible) */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm truncate block",
                    n.unread && "font-semibold",
                  )}
                >
                  {n.subjectTitle}
                </span>
              </div>

              {/* Repo */}
              <div className="w-[160px] shrink-0">
                <span className="text-xs text-muted-foreground truncate block">
                  {n.repoFullName}
                </span>
              </div>

              {/* Reason */}
              <div className="w-[80px] shrink-0">
                <span className="text-xs text-muted-foreground">
                  {REASON_LABELS[n.reason] ?? n.reason}
                </span>
              </div>

              {/* Time */}
              <div className="w-[55px] shrink-0 text-right">
                <TimeAgo date={n.updatedAt} />
              </div>

              {/* Mark read */}
              <div className="w-8 shrink-0 flex items-center justify-center">
                {n.unread && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(n.id);
                    }}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
