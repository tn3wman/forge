import { useState, useEffect, useRef } from "react";
import { useKeyboardShortcuts, type Shortcut } from "@/hooks/useKeyboardShortcuts";
import forgeIcon from "@/assets/forge-icon.png";
import {
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
import { useWorkspaceStore, type AppPage } from "@/stores/workspaceStore";
import { useWorkspaces } from "@/queries/useWorkspaces";
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
import { Terminals } from "@/pages/Terminals";
import { useTerminalStore } from "@/stores/terminalStore";
import { useAgentEventBridge } from "@/hooks/useAgentSession";
import { getWorkspaceColor } from "@/lib/workspaceColors";

const navItems: { icon: typeof LayoutDashboard; label: string; shortcut: string; page: AppPage }[] = [
  { icon: LayoutDashboard, label: "Dashboard", shortcut: "G D", page: "dashboard" },
  { icon: Bell, label: "Notifications", shortcut: "G N", page: "notifications" },
  { icon: CircleDot, label: "Issues", shortcut: "G I", page: "issues" },
  { icon: GitPullRequest, label: "Pull Requests", shortcut: "G P", page: "pull-requests" },
];

const gitNavItems: { icon: typeof LayoutDashboard; label: string; shortcut: string; page: AppPage }[] = [
  { icon: FileEdit, label: "Changes", shortcut: "G H", page: "changes" },
  { icon: GitCommitHorizontal, label: "Commit Graph", shortcut: "G C", page: "commit-graph" },
  { icon: GitBranch, label: "Branches", shortcut: "G B", page: "branches" },
];

const PAGE_TITLES: Record<AppPage, string> = {
  home: "",
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
    case "home":
      return null;
  }
}

const GIT_PAGES: AppPage[] = ["changes", "commit-graph", "branches"];

export function AppShell() {
  useAgentEventBridge();

  const { activeWorkspaceId, activePage, setActiveWorkspaceId, setActivePage, navigateToChanges, navigateToCommitGraph, navigateToBranches } =
    useWorkspaceStore();
  const { data: workspaces } = useWorkspaces();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const workspaceRepoNames = repos?.map((r) => r.fullName);
  const unreadCount = useUnreadCount(workspaceRepoNames);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Active workspace color tint
  const activeWorkspace = workspaces?.find((ws) => ws.id === activeWorkspaceId);
  const workspaceColorHex = activeWorkspace ? getWorkspaceColor(activeWorkspace.color).bg : null;
  const tintStyle = workspaceColorHex
    ? { backgroundColor: `color-mix(in srgb, ${workspaceColorHex} 6%, transparent)` }
    : undefined;

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
    { label: "Home", keys: "G T", mode: "sequence", sequenceKey: "t", category: "Navigation", action: () => setActivePage("home") },
    { label: "Home", keys: "⌘ `", mode: "combo" as const, key: "`", meta: true, category: "Navigation", action: () => setActivePage("home") },
    { label: "New Agent", keys: "⌘ ⇧ `", mode: "combo" as const, key: "`", meta: true, shift: true, category: "Terminal", action: () => { if (activeWorkspaceId) { useTerminalStore.getState().addPreSessionTab(activeWorkspaceId); setActivePage("home"); } } },
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
      {/* Icon Sidebar — workspaces + nav. Wide enough to contain macOS traffic lights with equal padding */}
      <div className="flex w-20 flex-col items-center border-r bg-sidebar pt-10 pb-4" style={tintStyle}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden">
              <img src={forgeIcon} alt="Forge" className="h-12 w-12" draggable={false} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Forge</TooltipContent>
        </Tooltip>

        <Separator className="mb-3 w-12" />

        {/* Workspace icons */}
        <WorkspaceSwitcher />

        <Separator className="my-3 w-12" />

        {/* Nav items */}
        <div className="flex flex-col items-center gap-1.5">
          {navItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActivePage(item.page)}
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-md transition-colors",
                    activePage === item.page
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
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

        <Separator className="my-3 w-12" />

        {/* Git nav items */}
        <div className="flex flex-col items-center gap-1.5">
          {gitNavItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleGitNav(item.page)}
                  disabled={!firstLocalPath}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-md transition-colors",
                    !firstLocalPath && "opacity-30 cursor-not-allowed",
                    activePage === item.page
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
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

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActivePage("settings")}
              className={cn(
                "mb-2 flex h-12 w-12 items-center justify-center rounded-md transition-colors",
                activePage === "settings"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <SettingsIcon className="h-5 w-5" />

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

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {activePage !== "home" && activePage !== "issues" && activePage !== "pull-requests" && activePage !== "dashboard" && activePage !== "notifications" && activePage !== "changes" && activePage !== "commit-graph" && activePage !== "branches" && (
          <div
            className="flex shrink-0 items-center border-b px-4 h-8"
            data-tauri-drag-region
            style={tintStyle}
          >
            <span className="text-xs font-medium text-muted-foreground" data-tauri-drag-region>
              {PAGE_TITLES[activePage]}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          {activeWorkspaceId ? (
            <>
              {/* Terminal layer: always mounted, hidden when another page is active */}
              <div
                className={cn(
                  "absolute inset-0",
                  activePage !== "home" && "invisible"
                )}
              >
                <Terminals onNewTerminal={() => { if (activeWorkspaceId) { useTerminalStore.getState().addPreSessionTab(activeWorkspaceId); } }} />
              </div>

              {/* Page layer: rendered on top when not on home */}
              {activePage !== "home" && (
                <div className="absolute inset-0">
                  <PageContent page={activePage} />
                </div>
              )}
            </>
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
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        shortcuts={shortcuts}
      />
    </div>
  );
}
