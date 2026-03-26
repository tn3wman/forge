import { useMemo } from "react";
import {
  GitPullRequest,
  CircleDot,
  AlertCircle,
  GitMerge,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/queries/useDashboard";
import { usePullRequests } from "@/queries/usePullRequests";
import { useIssues } from "@/queries/useIssues";
import { PrListItem } from "@/components/github/PrListItem";
import { IssueListItem } from "@/components/github/IssueListItem";
import type { PullRequest, Issue } from "@forge/shared";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  className?: string;
}

function StatCard({ icon, label, value, className }: StatCardProps) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border border-border bg-card p-3", className)}>
      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-accent">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold tabular-nums leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

type ActivityItem =
  | { type: "pr"; data: PullRequest; updatedAt: string }
  | { type: "issue"; data: Issue; updatedAt: string };

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: prs = [] } = usePullRequests();
  const { data: issues = [] } = useIssues();

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...prs.slice(0, 10).map((pr): ActivityItem => ({ type: "pr", data: pr, updatedAt: pr.updatedAt })),
      ...issues.slice(0, 10).map((issue): ActivityItem => ({ type: "issue", data: issue, updatedAt: issue.updatedAt })),
    ];
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return items.slice(0, 15);
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
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="grid grid-cols-4 gap-3 p-3">
        <StatCard
          icon={<GitPullRequest className="h-4 w-4 text-green-400" />}
          label="Open PRs"
          value={stats?.totalOpenPrs ?? 0}
        />
        <StatCard
          icon={<CircleDot className="h-4 w-4 text-green-400" />}
          label="Open Issues"
          value={stats?.totalOpenIssues ?? 0}
        />
        <StatCard
          icon={<AlertCircle className="h-4 w-4 text-yellow-400" />}
          label="Needs Review"
          value={stats?.prsNeedingReview ?? 0}
        />
        <StatCard
          icon={<GitMerge className="h-4 w-4 text-purple-400" />}
          label="Recently Merged"
          value={stats?.recentlyMerged ?? 0}
        />
      </div>

      <div className="px-3 py-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Recent Activity
        </h2>
      </div>

      <div className="flex-1">
        {recentActivity.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <span className="text-sm">No recent activity</span>
            <span className="text-xs text-muted-foreground/70 mt-1">
              Add repositories to your workspace to see activity
            </span>
          </div>
        )}

        {recentActivity.map((item) =>
          item.type === "pr" ? (
            <PrListItem key={`pr-${item.data.id}`} pr={item.data} />
          ) : (
            <IssueListItem key={`issue-${item.data.id}`} issue={item.data} />
          ),
        )}
      </div>
    </div>
  );
}
