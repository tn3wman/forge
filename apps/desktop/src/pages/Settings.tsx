import { useEffect, useState } from "react";
import { User, Bell, GitBranch, FolderGit2, Settings as SettingsIcon, Bot } from "lucide-react";
import { check } from "@tauri-apps/plugin-updater";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RepoItem } from "@/components/repository/RepoList";
import { AddRepoDialog } from "@/components/repository/AddRepoDialog";
import { useRepositories } from "@/queries/useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const GITHUB_POLL_OPTIONS = [
  { label: "30 seconds", value: 30_000 },
  { label: "1 minute", value: 60_000 },
  { label: "2 minutes", value: 120_000 },
  { label: "5 minutes", value: 300_000 },
];

const GIT_POLL_OPTIONS = [
  { label: "2 seconds", value: 2_000 },
  { label: "5 seconds", value: 5_000 },
  { label: "10 seconds", value: 10_000 },
  { label: "30 seconds", value: 30_000 },
];

export function Settings() {
  const {
    loaded,
    loadSettings,
    updateSetting,
    githubPollInterval,
    gitPollInterval,
    showNotificationBadge,
    autoFetchOnSwitch,
    claudeExecutablePath,
  } = useSettingsStore();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const [showAddRepo, setShowAddRepo] = useState(false);

  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "none" | "error">("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  async function checkForUpdates() {
    setUpdateStatus("checking");
    try {
      const update = await check();
      if (update) {
        setUpdateStatus("available");
        setUpdateVersion(update.version);
      } else {
        setUpdateStatus("none");
      }
    } catch {
      setUpdateStatus("error");
    }
  }

  useEffect(() => {
    if (!loaded) {
      loadSettings();
    }
  }, [loaded, loadSettings]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>Manage your GitHub account connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatarUrl} alt={user?.login} />
                  <AvatarFallback>{user?.login?.charAt(0).toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user?.name ?? user?.login}</p>
                  <p className="text-xs text-muted-foreground">@{user?.login}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Repositories */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Repositories</CardTitle>
            </div>
            <CardDescription>
              Manage repositories in this workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {repos && repos.length > 0 ? (
              <div className="space-y-0.5">
                {repos.map((repo) => (
                  <RepoItem key={repo.id} repo={repo} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No repositories added yet
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddRepo(true)}
              className="mt-2"
            >
              Add Repository
            </Button>
            <AddRepoDialog open={showAddRepo} onOpenChange={setShowAddRepo} />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notification-badge">Show unread badge</Label>
              <Switch
                id="notification-badge"
                checked={showNotificationBadge}
                onCheckedChange={(checked) => updateSetting("showNotificationBadge", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="github-poll">GitHub poll interval</Label>
              <select
                id="github-poll"
                value={githubPollInterval}
                onChange={(e) => updateSetting("githubPollInterval", Number(e.target.value))}
                className="rounded-md border bg-background px-2 py-1 text-sm"
              >
                {GITHUB_POLL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Git */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Git</CardTitle>
            </div>
            <CardDescription>Configure local Git behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-fetch">Auto-fetch on switch</Label>
              <Switch
                id="auto-fetch"
                checked={autoFetchOnSwitch}
                onCheckedChange={(checked) => updateSetting("autoFetchOnSwitch", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="git-poll">Git status poll interval</Label>
              <select
                id="git-poll"
                value={gitPollInterval}
                onChange={(e) => updateSetting("gitPollInterval", Number(e.target.value))}
                className="rounded-md border bg-background px-2 py-1 text-sm"
              >
                {GIT_POLL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Claude Code */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Claude Code</CardTitle>
            </div>
            <CardDescription>
              Override the Claude executable Forge uses for SDK-backed chat sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="claude-executable-path">Executable path override</Label>
              <input
                id="claude-executable-path"
                value={claudeExecutablePath}
                onChange={(e) => updateSetting("claudeExecutablePath", e.target.value)}
                placeholder="Leave empty to use the discovered claude binary from PATH"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Forge uses the official Claude Agent SDK host and still requires Claude Code to be installed and authenticated locally.
            </p>
          </CardContent>
        </Card>

        {/* Updates */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Updates</CardTitle>
            </div>
            <CardDescription>Check for new versions of Forge</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {updateStatus === "idle" && <span className="text-muted-foreground">Click to check for updates</span>}
                {updateStatus === "checking" && <span className="text-muted-foreground">Checking...</span>}
                {updateStatus === "available" && <span className="text-green-500">Version {updateVersion} available!</span>}
                {updateStatus === "none" && <span className="text-muted-foreground">You&apos;re up to date</span>}
                {updateStatus === "error" && <span className="text-destructive">Failed to check for updates</span>}
              </div>
              <Button variant="outline" size="sm" onClick={checkForUpdates} disabled={updateStatus === "checking"}>
                Check for Updates
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle>About</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">Forge v0.0.0</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Built with Tauri 2, React 19, and Rust
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
