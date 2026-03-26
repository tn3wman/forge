import { useState, useEffect, useRef } from "react";
import { useKeyboardShortcuts, type Shortcut } from "@/hooks/useKeyboardShortcuts";
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
import { Settings } from "@/pages/Settings";
import { Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useUnreadCount } from "@/queries/useNotifications";
import { Notifications } from "@/pages/Notifications";
import { Search } from "@/pages/Search";
import { Terminal as TerminalIcon } from "lucide-react";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { NewTerminalDialog } from "@/components/terminal/NewTerminalDialog";
import { useTerminalStore } from "@/stores/terminalStore";

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
  search: "Search",
  settings: "Settings",
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
      return <Notifications />;
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
    case "search":
      return <Search />;
    case "settings":
      return <Settings />;
  }
}

const GIT_PAGES: AppPage[] = ["changes", "commit-graph", "branches"];

export function AppShell() {
  const { activeWorkspaceId, activePage, setActiveWorkspaceId, setActivePage, navigateToChanges, navigateToCommitGraph, navigateToBranches } =
    useWorkspaceStore();
  const unreadCount = useUnreadCount();
  const { data: workspaces } = useWorkspaces();
  const { data: activeWorkspace } = useWorkspace(activeWorkspaceId);
  const { data: repos } = useRepositories(activeWorkspaceId);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [newTerminalOpen, setNewTerminalOpen] = useState(false);
  const { isOpen: terminalOpen, togglePanel: toggleTerminal, tabs: terminalTabs } = useTerminalStore();

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

  // G+key navigation shortcuts, Cmd+K, & Escape
  const shortcuts: Shortcut[] = [
    { label: "Command Palette", keys: "\u2318 K", mode: "combo", key: "k", meta: true, category: "General", action: () => setCommandPaletteOpen(true) },
    { label: "Dashboard", keys: "G D", mode: "sequence", sequenceKey: "d", category: "Navigation", action: () => setActivePage("dashboard") },
    { label: "Pull Requests", keys: "G P", mode: "sequence", sequenceKey: "p", category: "Navigation", action: () => setActivePage("pull-requests") },
    { label: "Issues", keys: "G I", mode: "sequence", sequenceKey: "i", category: "Navigation", action: () => setActivePage("issues") },
    { label: "Notifications", keys: "G N", mode: "sequence", sequenceKey: "n", category: "Navigation", action: () => setActivePage("notifications") },
    { label: "Changes", keys: "G H", mode: "sequence", sequenceKey: "h", category: "Git", enabled: !!firstLocalPath, action: () => firstLocalPathRef.current && navigateToChanges(firstLocalPathRef.current) },
    { label: "Commit Graph", keys: "G C", mode: "sequence", sequenceKey: "c", category: "Git", enabled: !!firstLocalPath, action: () => firstLocalPathRef.current && navigateToCommitGraph(firstLocalPathRef.current) },
    { label: "Branches", keys: "G B", mode: "sequence", sequenceKey: "b", category: "Git", enabled: !!firstLocalPath, action: () => firstLocalPathRef.current && navigateToBranches(firstLocalPathRef.current) },
    { label: "Search", keys: "G S", mode: "sequence", sequenceKey: "s", category: "Navigation", action: () => setActivePage("search") },
    { label: "Settings", keys: "G ,", mode: "sequence", sequenceKey: ",", category: "Navigation", action: () => setActivePage("settings") },
    { label: "Toggle Terminal", keys: "⌘ `", mode: "combo" as const, key: "`", meta: true, category: "Terminal", action: () => useTerminalStore.getState().togglePanel() },
    { label: "New Terminal", keys: "⌘ ⇧ `", mode: "combo" as const, key: "`", meta: true, shift: true, category: "Terminal", action: () => setNewTerminalOpen(true) },
    {
      label: "Go Back", keys: "Esc", mode: "combo", key: "Escape", category: "Navigation",
      action: () => {
        const { activePage, goBack } = useWorkspaceStore.getState();
        if (["pr-detail", "issue-detail", "changes", "commit-graph", "branches"].includes(activePage)) {
          goBack();
        }
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

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
                    "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    activePage === item.page
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.page === "notifications" && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
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

        <Separator className="my-3 w-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleTerminal}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                terminalOpen
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <TerminalIcon className="h-4 w-4" />
              {terminalTabs.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                  {terminalTabs.length}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Terminal
            <span className="ml-2 text-xs text-muted-foreground">⌘`</span>
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActivePage("settings")}
              className={cn(
                "mb-2 flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                activePage === "settings"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Settings
            <span className="ml-2 text-xs text-muted-foreground">G ,</span>
          </TooltipContent>
        </Tooltip>

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

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {activeWorkspaceId ? (
              <PageContent page={activePage} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Anvil className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h2 className="text-lg font-medium text-muted-foreground">Welcome to Forge</h2>
                  <p className="mt-1 text-sm text-muted-foreground/70">Create a workspace to get started</p>
                </div>
              </div>
            )}
          </div>
          {terminalOpen && (
            <TerminalPanel onNewTerminal={() => setNewTerminalOpen(true)} />
          )}
        </div>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        shortcuts={shortcuts}
      />
      <NewTerminalDialog open={newTerminalOpen} onOpenChange={setNewTerminalOpen} />
    </div>
  );
}
