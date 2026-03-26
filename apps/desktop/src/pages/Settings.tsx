import { useEffect } from "react";
import { User, Bell, GitBranch, Settings as SettingsIcon } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
  } = useSettingsStore();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

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
