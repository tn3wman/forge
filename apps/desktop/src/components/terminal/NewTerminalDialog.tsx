import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Terminal, Loader2 } from "lucide-react";
import { terminalIpc } from "@/ipc/terminal";
import { useTerminalStore } from "@/stores/terminalStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useRepositories } from "@/queries/useRepositories";
import { cn } from "@/lib/utils";
import type { AgentMode, CliInfo } from "@forge/shared";

const MODE_OPTIONS: { value: AgentMode; label: string; description: string }[] = [
  { value: "Normal", label: "Normal", description: "Standard interactive mode" },
  { value: "Plan", label: "Plan Mode", description: "Read-only planning, no file changes" },
  { value: "DangerouslyBypassPermissions", label: "Bypass Permissions", description: "Skip all permission prompts (use with caution)" },
];

interface NewTerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTerminalDialog({ open, onOpenChange }: NewTerminalDialogProps) {
  const [clis, setClis] = useState<CliInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCli, setSelectedCli] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<AgentMode>("Normal");
  const { addTab } = useTerminalStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const workingDirectory = repos?.find((r) => r.localPath)?.localPath ?? undefined;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedCli(null);
    setSelectedMode("Normal");
    terminalIpc
      .discoverClis()
      .then((found) => {
        setClis(found);
        if (found.length > 0) {
          setSelectedCli(found[0].name);
        }
      })
      .catch(() => setClis([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleCreate() {
    if (!selectedCli || !activeWorkspaceId) return;
    setCreating(true);
    try {
      const session = await terminalIpc.createSession({
        cliName: selectedCli,
        mode: selectedMode,
        workspaceId: activeWorkspaceId,
        workingDirectory,
      });
      addTab({
        sessionId: session.id,
        label: session.displayName,
        cliName: session.cliName,
        mode: session.mode,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create terminal session:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Terminal</DialogTitle>
          <DialogDescription>
            Select an AI coding CLI and mode to start a new terminal session.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Discovering CLIs...</span>
          </div>
        ) : clis.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Terminal className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">No AI CLIs found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Install Claude Code, Codex, or Aider and make sure they are on your PATH.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CLI</label>
              <div className="grid gap-2">
                {clis.map((cli) => (
                  <button
                    key={cli.name}
                    onClick={() => setSelectedCli(cli.name)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                      selectedCli === cli.name
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/20",
                    )}
                  >
                    <Terminal className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{cli.displayName}</p>
                      {cli.version && (
                        <p className="text-xs text-muted-foreground">v{cli.version}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mode</label>
              <div className="grid gap-2">
                {MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setSelectedMode(mode.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                      selectedMode === mode.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/20",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        selectedMode === mode.value
                          ? "border-primary"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {selectedMode === mode.value && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!selectedCli || creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
