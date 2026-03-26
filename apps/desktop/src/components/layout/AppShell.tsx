import { useEffect, useRef } from "react";
import {
  Anvil,
  GitPullRequest,
  CircleDot,
  Bell,
  LayoutDashboard,
  FileEdit,
  GitCommitHorizontal,
  GitBranch,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMenu } from "@/components/auth/UserMenu";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { RepoList } from "@/components/repository/RepoList";
import { useWorkspaceStore, type AppPage } from "@/stores/workspaceStore";
import { useWorkspaces, useWorkspace } from "@/queries/useWorkspaces";
import { useRepositories } from "@/queries/useRepositories";
import { Dashboard } from "@/pages/Dashboard";
import { PullRequests } from "@/pages/PullRequests";
import { Issues } from "@/pages/Issues";
import { PrDetail } from "@/pages/PrDetail";
import { IssueDetail } from "@/pages/IssueDetail";
import { CommitGraph } from "@/pages/CommitGraph";
import { Changes } from "@/pages/Changes";
import { Branches } from "@/pages/Branches";
import { cn } from "@/lib/utils";

const navItems: { icon: typeof LayoutDashboard; label: string; shortcut: string; page: AppPage }[] = [
  { icon: LayoutDashboard, label: "Dashboard", shortcut: "G D", page: "dashboard" },
  { icon: GitPullRequest, label: "Pull Requests", shortcut: "G P", page: "pull-requests" },
  { icon: CircleDot, label: "Issues", shortcut: "G I", page: "issues" },
  { icon: Bell, label: "Notifications", shortcut: "G N", page: "notifications" },
];

const gitNavItems: { icon: typeof LayoutDashboard; label: string; shortcut: string; page: AppPage }[] = [
  { icon: FileEdit, label: "Changes", shortcut: "G H", page: "changes" },
  { icon: GitCommitHorizontal, label: "Commit Graph", shortcut: "G C", page: "commit-graph" },
  { icon: GitBranch, label: "Branches", shortcut: "G B", page: "branches" },
];

const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: "Dashboard",
  "pull-requests": "Pull Requests",
  issues: "Issues",
  notifications: "Notifications",
  "pr-detail": "Pull Request",
  "issue-detail": "Issue",
  "commit-graph": "Commit Graph",
  changes: "Changes",
  branches: "Branches",
};

function PageContent({ page }: { page: AppPage }) {
  switch (page) {
    case "dashboard":
      return <Dashboard />;
    case "pull-requests":
      return <PullRequests />;
    case "issues":
      return <Issues />;
    case "notifications":
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">Notifications coming in Phase 6</p>
          </div>
        </div>
      );
    case "pr-detail":
      return <PrDetail />;
    case "issue-detail":
      return <IssueDetail />;
    case "commit-graph":
      return <CommitGraph />;
    case "changes":
      return <Changes />;
    case "branches":
      return <Branches />;
  }
}

const GIT_PAGES: AppPage[] = ["changes", "commit-graph", "branches"];

export function AppShell() {
  const { activeWorkspaceId, activePage, setActiveWorkspaceId, setActivePage, navigateToChanges, navigateToCommitGraph, navigateToBranches } =
    useWorkspaceStore();
  const { data: workspaces } = useWorkspaces();
  const { data: activeWorkspace } = useWorkspace(activeWorkspaceId);
  const { data: repos } = useRepositories(activeWorkspaceId);

  // Find first repo with a local path for git navigation
  const firstLocalPath = repos?.find((r) => r.localPath)?.localPath ?? null;
  const firstLocalPathRef = useRef(firstLocalPath);
  firstLocalPathRef.current = firstLocalPath;

  function handleGitNav(page: AppPage) {
    if (!firstLocalPath) return;
    switch (page) {
      case "changes": navigateToChanges(firstLocalPath); break;
      case "commit-graph": navigateToCommitGraph(firstLocalPath); break;
      case "branches": navigateToBranches(firstLocalPath); break;
    }
  }

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [activeWorkspaceId, workspaces, setActiveWorkspaceId]);

  // Cmd+1-9 for workspace switching
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && workspaces) {
        const ws = workspaces[num - 1];
        if (ws) {
          e.preventDefault();
          setActiveWorkspaceId(ws.id);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workspaces, setActiveWorkspaceId]);

  // G+key navigation shortcuts
  useEffect(() => {
    let gPressed = false;
    let timeout: ReturnType<typeof setTimeout>;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        const { activePage, goBack } = useWorkspaceStore.getState();
        if (activePage === "pr-detail" || activePage === "issue-detail" || activePage === "changes" || activePage === "commit-graph" || activePage === "branches") {
          goBack();
        }
        return;
      }
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        gPressed = true;
        clearTimeout(timeout);
        timeout = setTimeout(() => { gPressed = false; }, 500);
        return;
      }
      if (gPressed) {
        gPressed = false;
        switch (e.key) {
          case "d": setActivePage("dashboard"); break;
          case "p": setActivePage("pull-requests"); break;
          case "i": setActivePage("issues"); break;
          case "n": setActivePage("notifications"); break;
          case "h": case "c": case "b": {
            const lp = firstLocalPathRef.current;
            if (!lp) break;
            const { navigateToChanges, navigateToCommitGraph, navigateToBranches } = useWorkspaceStore.getState();
            if (e.key === "h") navigateToChanges(lp);
            else if (e.key === "c") navigateToCommitGraph(lp);
            else navigateToBranches(lp);
            break;
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [setActivePage]);

  return (
    <div className="flex h-screen">
      {/* Icon Sidebar — workspaces + nav */}
      <div className="flex w-12 flex-col items-center border-r bg-sidebar py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Anvil className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Forge</TooltipContent>
        </Tooltip>

        <Separator className="mb-3 w-6" />

        {/* Workspace icons */}
        <WorkspaceSwitcher />

        <Separator className="my-3 w-6" />

        {/* Nav items */}
        <div className="flex flex-col items-center gap-1">
          {navItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActivePage(item.page)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    activePage === item.page
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.label}
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.shortcut}
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator className="my-3 w-6" />

        {/* Git nav items */}
        <div className="flex flex-col items-center gap-1">
          {gitNavItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleGitNav(item.page)}
                  disabled={!firstLocalPath}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    !firstLocalPath && "opacity-30 cursor-not-allowed",
                    activePage === item.page
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.label}
                {firstLocalPath ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.shortcut}
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Set a local path first
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex-1" />

        {/* User menu at bottom */}
        <UserMenu />
      </div>

      {/* Repo sidebar */}
      <div className="flex w-56 flex-col border-r bg-sidebar/50">
        <div
          className="flex h-10 shrink-0 items-center border-b px-3"
          data-tauri-drag-region
        >
          <span
            className="text-xs font-medium text-muted-foreground"
            data-tauri-drag-region
          >
            {activeWorkspace?.name ?? "Forge"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          <RepoList />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        <div
          className="flex h-10 shrink-0 items-center border-b px-4"
          data-tauri-drag-region
        >
          <span
            className="text-xs font-medium text-muted-foreground"
            data-tauri-drag-region
          >
            {PAGE_TITLES[activePage]}
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeWorkspaceId ? (
            <PageContent page={activePage} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Anvil className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h2 className="text-lg font-medium text-muted-foreground">
                  Welcome to Forge
                </h2>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  Create a workspace to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
