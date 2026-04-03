"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppShell = AppShell;
var react_1 = require("react");
var useKeyboardShortcuts_1 = require("@/hooks/useKeyboardShortcuts");
var forge_icon_png_1 = require("@/assets/forge-icon.png");
var lucide_react_1 = require("lucide-react");
var separator_1 = require("@/components/ui/separator");
var tooltip_1 = require("@/components/ui/tooltip");
var UserMenu_1 = require("@/components/auth/UserMenu");
var WorkspaceSwitcher_1 = require("@/components/workspace/WorkspaceSwitcher");
var workspaceStore_1 = require("@/stores/workspaceStore");
var useWorkspaces_1 = require("@/queries/useWorkspaces");
var useRepositories_1 = require("@/queries/useRepositories");
var Dashboard_1 = require("@/pages/Dashboard");
var PullRequests_1 = require("@/pages/PullRequests");
var Issues_1 = require("@/pages/Issues");
var PrDetail_1 = require("@/pages/PrDetail");
var IssueDetail_1 = require("@/pages/IssueDetail");
var CommitGraph_1 = require("@/pages/CommitGraph");
var Changes_1 = require("@/pages/Changes");
var Branches_1 = require("@/pages/Branches");
var Settings_1 = require("@/pages/Settings");
var lucide_react_2 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var CommandPalette_1 = require("@/components/layout/CommandPalette");
var useNotifications_1 = require("@/queries/useNotifications");
var Notifications_1 = require("@/pages/Notifications");
var Search_1 = require("@/pages/Search");
var Terminals_1 = require("@/pages/Terminals");
var terminalStore_1 = require("@/stores/terminalStore");
var useAgentSession_1 = require("@/hooks/useAgentSession");
var useRestoreAgentSessions_1 = require("@/hooks/useRestoreAgentSessions");
var workspaceColors_1 = require("@/lib/workspaceColors");
var navItems = [
    { icon: lucide_react_1.LayoutDashboard, label: "Dashboard", shortcut: "G D", page: "dashboard" },
    { icon: lucide_react_1.Bell, label: "Notifications", shortcut: "G N", page: "notifications" },
    { icon: lucide_react_1.CircleDot, label: "Issues", shortcut: "G I", page: "issues" },
    { icon: lucide_react_1.GitPullRequest, label: "Pull Requests", shortcut: "G P", page: "pull-requests" },
];
var gitNavItems = [
    { icon: lucide_react_1.FileEdit, label: "Changes", shortcut: "G H", page: "changes" },
    { icon: lucide_react_1.GitCommitHorizontal, label: "Commit Graph", shortcut: "G C", page: "commit-graph" },
    { icon: lucide_react_1.GitBranch, label: "Branches", shortcut: "G B", page: "branches" },
];
var PAGE_TITLES = {
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
function PageContent(_a) {
    var page = _a.page;
    switch (page) {
        case "dashboard":
            return <Dashboard_1.Dashboard />;
        case "pull-requests":
            return <PullRequests_1.PullRequests />;
        case "issues":
            return <Issues_1.Issues />;
        case "notifications":
            return <Notifications_1.Notifications />;
        case "pr-detail":
            return <PrDetail_1.PrDetail />;
        case "issue-detail":
            return <IssueDetail_1.IssueDetail />;
        case "commit-graph":
            return <CommitGraph_1.CommitGraph />;
        case "changes":
            return <Changes_1.Changes />;
        case "branches":
            return <Branches_1.Branches />;
        case "search":
            return <Search_1.Search />;
        case "settings":
            return <Settings_1.Settings />;
        case "home":
            return null;
    }
}
var GIT_PAGES = ["changes", "commit-graph", "branches"];
function AppShell() {
    var _a, _b;
    (0, useAgentSession_1.useAgentEventBridge)();
    var _c = (0, workspaceStore_1.useWorkspaceStore)(), activeWorkspaceId = _c.activeWorkspaceId, activePage = _c.activePage, setActiveWorkspaceId = _c.setActiveWorkspaceId, setActivePage = _c.setActivePage, navigateToChanges = _c.navigateToChanges, navigateToCommitGraph = _c.navigateToCommitGraph, navigateToBranches = _c.navigateToBranches;
    (0, useRestoreAgentSessions_1.useRestoreAgentSessions)(activeWorkspaceId);
    var workspaces = (0, useWorkspaces_1.useWorkspaces)().data;
    var repos = (0, useRepositories_1.useRepositories)(activeWorkspaceId).data;
    var workspaceRepoNames = repos === null || repos === void 0 ? void 0 : repos.map(function (r) { return r.fullName; });
    var unreadCount = (0, useNotifications_1.useUnreadCount)(workspaceRepoNames);
    var _d = (0, react_1.useState)(false), commandPaletteOpen = _d[0], setCommandPaletteOpen = _d[1];
    // Active workspace color tint
    var activeWorkspace = workspaces === null || workspaces === void 0 ? void 0 : workspaces.find(function (ws) { return ws.id === activeWorkspaceId; });
    var workspaceColorHex = activeWorkspace ? (0, workspaceColors_1.getWorkspaceColor)(activeWorkspace.color).bg : null;
    var tintStyle = workspaceColorHex
        ? { backgroundColor: "color-mix(in srgb, ".concat(workspaceColorHex, " 6%, transparent)") }
        : undefined;
    // Find first repo with a local path for git navigation
    var firstLocalPath = (_b = (_a = repos === null || repos === void 0 ? void 0 : repos.find(function (r) { return r.localPath; })) === null || _a === void 0 ? void 0 : _a.localPath) !== null && _b !== void 0 ? _b : null;
    var firstLocalPathRef = (0, react_1.useRef)(firstLocalPath);
    firstLocalPathRef.current = firstLocalPath;
    function handleGitNav(page) {
        if (!firstLocalPath)
            return;
        switch (page) {
            case "changes":
                navigateToChanges(firstLocalPath);
                break;
            case "commit-graph":
                navigateToCommitGraph(firstLocalPath);
                break;
            case "branches":
                navigateToBranches(firstLocalPath);
                break;
        }
    }
    // Auto-select first workspace if none selected
    (0, react_1.useEffect)(function () {
        if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
            setActiveWorkspaceId(workspaces[0].id);
        }
    }, [activeWorkspaceId, workspaces, setActiveWorkspaceId]);
    // Cmd+1-9 for workspace switching
    (0, react_1.useEffect)(function () {
        function handleKeyDown(e) {
            if (!e.metaKey && !e.ctrlKey)
                return;
            var num = parseInt(e.key);
            if (num >= 1 && num <= 9 && workspaces) {
                var ws = workspaces[num - 1];
                if (ws) {
                    e.preventDefault();
                    setActiveWorkspaceId(ws.id);
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return function () { return window.removeEventListener("keydown", handleKeyDown); };
    }, [workspaces, setActiveWorkspaceId]);
    // G+key navigation shortcuts, Cmd+K, & Escape
    var shortcuts = [
        { label: "Command Palette", keys: "\u2318 K", mode: "combo", key: "k", meta: true, category: "General", action: function () { return setCommandPaletteOpen(true); } },
        { label: "Dashboard", keys: "G D", mode: "sequence", sequenceKey: "d", category: "Navigation", action: function () { return setActivePage("dashboard"); } },
        { label: "Pull Requests", keys: "G P", mode: "sequence", sequenceKey: "p", category: "Navigation", action: function () { return setActivePage("pull-requests"); } },
        { label: "Issues", keys: "G I", mode: "sequence", sequenceKey: "i", category: "Navigation", action: function () { return setActivePage("issues"); } },
        { label: "Notifications", keys: "G N", mode: "sequence", sequenceKey: "n", category: "Navigation", action: function () { return setActivePage("notifications"); } },
        { label: "Changes", keys: "G H", mode: "sequence", sequenceKey: "h", category: "Git", enabled: !!firstLocalPath, action: function () { return firstLocalPathRef.current && navigateToChanges(firstLocalPathRef.current); } },
        { label: "Commit Graph", keys: "G C", mode: "sequence", sequenceKey: "c", category: "Git", enabled: !!firstLocalPath, action: function () { return firstLocalPathRef.current && navigateToCommitGraph(firstLocalPathRef.current); } },
        { label: "Branches", keys: "G B", mode: "sequence", sequenceKey: "b", category: "Git", enabled: !!firstLocalPath, action: function () { return firstLocalPathRef.current && navigateToBranches(firstLocalPathRef.current); } },
        { label: "Search", keys: "G S", mode: "sequence", sequenceKey: "s", category: "Navigation", action: function () { return setActivePage("search"); } },
        { label: "Settings", keys: "G ,", mode: "sequence", sequenceKey: ",", category: "Navigation", action: function () { return setActivePage("settings"); } },
        { label: "Home", keys: "G T", mode: "sequence", sequenceKey: "t", category: "Navigation", action: function () { return setActivePage("home"); } },
        { label: "Home", keys: "⌘ `", mode: "combo", key: "`", meta: true, category: "Navigation", action: function () { return setActivePage("home"); } },
        { label: "New Agent", keys: "⌘ ⇧ `", mode: "combo", key: "`", meta: true, shift: true, category: "Terminal", action: function () { if (activeWorkspaceId) {
                terminalStore_1.useTerminalStore.getState().addPreSessionTab(activeWorkspaceId);
                setActivePage("home");
            } } },
        {
            label: "Go Back", keys: "Esc", mode: "combo", key: "Escape", category: "Navigation",
            action: function () {
                var _a = workspaceStore_1.useWorkspaceStore.getState(), activePage = _a.activePage, goBack = _a.goBack;
                if (["pr-detail", "issue-detail", "changes", "commit-graph", "branches"].includes(activePage)) {
                    goBack();
                }
            },
        },
    ];
    (0, useKeyboardShortcuts_1.useKeyboardShortcuts)(shortcuts);
    return (<div className="flex h-screen">
      {/* Icon Sidebar — workspaces + nav. Wide enough to contain macOS traffic lights with equal padding */}
      <div className="flex w-20 flex-col items-center border-r bg-sidebar pt-10 pb-4" style={tintStyle}>
        <tooltip_1.Tooltip>
          <tooltip_1.TooltipTrigger asChild>
            <button className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden">
              <img src={forge_icon_png_1.default} alt="Forge" className="h-12 w-12" draggable={false}/>
            </button>
          </tooltip_1.TooltipTrigger>
          <tooltip_1.TooltipContent side="right">Forge</tooltip_1.TooltipContent>
        </tooltip_1.Tooltip>

        <separator_1.Separator className="mb-3 w-12"/>

        {/* Workspace icons */}
        <WorkspaceSwitcher_1.WorkspaceSwitcher />

        <separator_1.Separator className="my-3 w-12"/>

        {/* Nav items */}
        <div className="flex flex-col items-center gap-1.5">
          {navItems.map(function (item) { return (<tooltip_1.Tooltip key={item.label}>
              <tooltip_1.TooltipTrigger asChild>
                <button onClick={function () { return setActivePage(item.page); }} className={(0, utils_1.cn)("relative flex h-12 w-12 items-center justify-center rounded-md transition-colors", activePage === item.page
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <item.icon className="h-5 w-5"/>
                  {item.page === "notifications" && unreadCount > 0 && (<span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>)}
                </button>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">
                {item.label}
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.shortcut}
                </span>
              </tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>); })}
        </div>

        <separator_1.Separator className="my-3 w-12"/>

        {/* Git nav items */}
        <div className="flex flex-col items-center gap-1.5">
          {gitNavItems.map(function (item) { return (<tooltip_1.Tooltip key={item.label}>
              <tooltip_1.TooltipTrigger asChild>
                <button onClick={function () { return handleGitNav(item.page); }} disabled={!firstLocalPath} className={(0, utils_1.cn)("flex h-12 w-12 items-center justify-center rounded-md transition-colors", !firstLocalPath && "opacity-30 cursor-not-allowed", activePage === item.page
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <item.icon className="h-5 w-5"/>
                </button>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent side="right">
                {item.label}
                {firstLocalPath ? (<span className="ml-2 text-xs text-muted-foreground">
                    {item.shortcut}
                  </span>) : (<span className="ml-2 text-xs text-muted-foreground">
                    Set a local path first
                  </span>)}
              </tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>); })}
        </div>

        <div className="flex-1"/>

        <tooltip_1.Tooltip>
          <tooltip_1.TooltipTrigger asChild>
            <button onClick={function () { return setActivePage("settings"); }} className={(0, utils_1.cn)("mb-2 flex h-12 w-12 items-center justify-center rounded-md transition-colors", activePage === "settings"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              <lucide_react_2.Settings className="h-5 w-5"/>

            </button>
          </tooltip_1.TooltipTrigger>
          <tooltip_1.TooltipContent side="right">
            Settings
            <span className="ml-2 text-xs text-muted-foreground">G ,</span>
          </tooltip_1.TooltipContent>
        </tooltip_1.Tooltip>

        {/* User menu at bottom */}
        <UserMenu_1.UserMenu />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {activePage !== "home" && activePage !== "issues" && activePage !== "pull-requests" && activePage !== "dashboard" && activePage !== "notifications" && activePage !== "changes" && activePage !== "commit-graph" && activePage !== "branches" && (<div className="flex shrink-0 items-center border-b px-4 h-8" data-tauri-drag-region style={tintStyle}>
            <span className="text-xs font-medium text-muted-foreground" data-tauri-drag-region>
              {PAGE_TITLES[activePage]}
            </span>
          </div>)}

        <div className="flex-1 overflow-hidden relative">
          {activeWorkspaceId ? (<>
              {/* Terminal layer: always mounted, hidden when another page is active */}
              <div className={(0, utils_1.cn)("absolute inset-0", activePage !== "home" && "invisible")}>
                <Terminals_1.Terminals onNewTerminal={function () { if (activeWorkspaceId) {
            terminalStore_1.useTerminalStore.getState().addPreSessionTab(activeWorkspaceId);
        } }}/>
              </div>

              {/* Page layer: rendered on top when not on home */}
              {activePage !== "home" && (<div className="absolute inset-0">
                  <PageContent page={activePage}/>
                </div>)}
            </>) : (<div className="flex items-center justify-center h-full">
              <div className="text-center">
                <img src={forge_icon_png_1.default} alt="Forge" className="mx-auto mb-4 h-12 w-12 opacity-50"/>
                <h2 className="text-lg font-medium text-muted-foreground">Welcome to Forge</h2>
                <p className="mt-1 text-sm text-muted-foreground/70">Create a workspace to get started</p>
              </div>
            </div>)}
        </div>
      </div>
      <CommandPalette_1.CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} shortcuts={shortcuts}/>
    </div>);
}
