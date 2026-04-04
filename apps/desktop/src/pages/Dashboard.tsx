import { useMemo } from "react";
import {
  GitPullRequest,
  GitMerge,
  GitPullRequestClosed,
  GitPullRequestDraft,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/queries/useDashboard";
import { useWorkspaceTint } from "@/hooks/useWorkspaceTint";
import { usePullRequests } from "@/queries/usePullRequests";
import { useIssues } from "@/queries/useIssues";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/common/TimeAgo";
import type { PullRequest, Issue } from "@forge/shared";

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium shrink-0">
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

type ActivityItem =
  | { kind: "pr"; data: PullRequest; updatedAt: string }
  | { kind: "issue"; data: Issue; updatedAt: string };

function ActivityIcon({ item }: { item: ActivityItem }) {
  if (item.kind === "issue") {
    return item.data.state === "closed"
      ? <CheckCircle2 className="h-4 w-4 text-purple-400" />
      : <CircleDot className="h-4 w-4 text-green-400" />;
  }
  const pr = item.data;
  if (pr.draft) return <GitPullRequestDraft className="h-4 w-4 text-muted-foreground" />;
  if (pr.state === "merged") return <GitMerge className="h-4 w-4 text-purple-400" />;
  if (pr.state === "closed") return <GitPullRequestClosed className="h-4 w-4 text-red-400" />;
  return <GitPullRequest className="h-4 w-4 text-green-400" />;
}

function ActivityRow({ item, onClick }: { item: ActivityItem; onClick: () => void }) {
  const number = item.kind === "pr" ? item.data.number : item.data.number;
  const title = item.kind === "pr" ? item.data.title : item.data.title;
  const authorLogin = item.kind === "pr" ? item.data.authorLogin : item.data.authorLogin;
  const authorAvatarUrl = item.kind === "pr" ? item.data.authorAvatarUrl : item.data.authorAvatarUrl;
  const labels = item.kind === "issue" ? item.data.labels : item.data.labels;

  return (
    <div
      className="flex items-center h-10 gap-2 px-3 hover:bg-accent/50 transition-colors border-b border-border/50 cursor-pointer"
      onClick={onClick}
    >
      {/* Icon */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <ActivityIcon item={item} />
      </div>

      {/* Number */}
      <div className="w-[50px] shrink-0">
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          #{number}
        </span>
      </div>

      {/* Title (flexible) */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{title}</span>
      </div>

      {/* Labels */}
      <div className="w-[160px] shrink-0 flex items-center gap-1">
        {labels.slice(0, 3).map((label) => (
          <span key={label} className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground whitespace-nowrap">
            {label}
          </span>
        ))}
        {labels.length > 3 && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            +{labels.length - 3}
          </span>
        )}
      </div>

      {/* Diff stats (PRs only) */}
      <div className="w-[100px] shrink-0 flex items-center gap-1 text-xs tabular-nums">
        {item.kind === "pr" && (
          <>
            <Plus className="h-3 w-3 text-green-400" />
            <span className="text-green-400">{item.data.additions}</span>
            <Minus className="h-3 w-3 text-red-400 ml-1" />
            <span className="text-red-400">{item.data.deletions}</span>
          </>
        )}
      </div>

      {/* Author */}
      <div className="w-[100px] shrink-0 flex items-center gap-1.5 justify-end overflow-hidden">
        <span className="text-xs text-muted-foreground truncate">{authorLogin}</span>
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={authorAvatarUrl} alt={authorLogin} />
          <AvatarFallback className="text-[9px]">
            {authorLogin.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Updated */}
      <div className="w-[55px] shrink-0 text-right">
        <TimeAgo date={item.updatedAt} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const tintStyle = useWorkspaceTint();
  const { data: prs = [] } = usePullRequests();
  const { data: issuesData } = useIssues();
  const issues = useMemo(() => issuesData?.pages.flatMap((p) => p.issues) ?? [], [issuesData]);
  const { navigateToPr, navigateToIssue } = useWorkspaceStore();

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...prs.slice(0, 15).map((pr): ActivityItem => ({ kind: "pr", data: pr, updatedAt: pr.updatedAt })),
      ...issues.slice(0, 15).map((issue): ActivityItem => ({ kind: "issue", data: issue, updatedAt: issue.updatedAt })),
    ];
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return items.slice(0, 25);
  }, [prs, issues]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Title bar with stats */}
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border px-4 h-8"
        data-tauri-drag-region
        style={tintStyle}
      >
        <StatPill
          icon={<CircleDot className="h-3 w-3 text-green-400" />}
          label="Issues"
          value={stats?.totalOpenIssues ?? 0}
        />
        <StatPill
          icon={<GitPullRequest className="h-3 w-3 text-green-400" />}
          label="PRs"
          value={stats?.totalOpenPrs ?? 0}
        />
        <StatPill
          icon={<AlertCircle className="h-3 w-3 text-yellow-400" />}
          label="Review"
          value={stats?.prsNeedingReview ?? 0}
        />
        <StatPill
          icon={<GitMerge className="h-3 w-3 text-purple-400" />}
          label="Merged"
          value={stats?.recentlyMerged ?? 0}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {recentActivity.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <span className="text-sm">No recent activity</span>
            <span className="text-xs text-muted-foreground/70 mt-1">
              Add repositories to your workspace to see activity
            </span>
          </div>
        )}

        {recentActivity.map((item) => (
          <ActivityRow
            key={`${item.kind}-${item.kind === "pr" ? item.data.id : item.data.id}`}
            item={item}
            onClick={() => {
              if (item.kind === "pr" && item.data.repoFullName) {
                navigateToPr(item.data.repoFullName, item.data.number);
              } else if (item.kind === "issue" && item.data.repoFullName) {
                navigateToIssue(item.data.repoFullName, item.data.number);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
