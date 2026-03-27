import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Terminal, Loader2, MessageSquare } from "lucide-react";
import { terminalIpc } from "@/ipc/terminal";
import { agentIpc } from "@/ipc/agent";
import { useTerminalStore } from "@/stores/terminalStore";
import { useAgentStore } from "@/stores/agentStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useRepositories } from "@/queries/useRepositories";
import { cn } from "@/lib/utils";
import type { AgentMode, AgentChatMode, CliInfo } from "@forge/shared";

const MODE_OPTIONS: { value: AgentMode; label: string; description: string }[] = [
  { value: "Normal", label: "Normal", description: "Standard interactive mode" },
  { value: "Plan", label: "Plan Mode", description: "Read-only planning, no file changes" },
  { value: "DangerouslyBypassPermissions", label: "Bypass Permissions", description: "Skip all permission prompts (use with caution)" },
];

const CHAT_MODE_OPTIONS: { value: AgentChatMode; label: string; description: string }[] = [
  { value: "Default", label: "Default", description: "Standard mode with permission prompts" },
  { value: "Plan", label: "Plan Mode", description: "Read-only planning, no file changes" },
  { value: "Auto", label: "Auto", description: "Automatically accept safe operations" },
  { value: "BypassPermissions", label: "YOLO", description: "Skip all permission prompts" },
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
  const [sessionType, setSessionType] = useState<"terminal" | "chat">("terminal");
  const [selectedChatMode, setSelectedChatMode] = useState<AgentChatMode>("Default");
  const [initialPrompt, setInitialPrompt] = useState("");
  const { addTab } = useTerminalStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: repos } = useRepositories(activeWorkspaceId);
  const workingDirectory = repos?.find((r) => r.localPath)?.localPath ?? undefined;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedCli(null);
    setSelectedMode("Normal");
    setSessionType("terminal");
    setSelectedChatMode("Default");
    setInitialPrompt("");
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
      if (sessionType === "chat") {
        const session = await agentIpc.createSession({
          cliName: selectedCli,
          mode: selectedChatMode,
          workspaceId: activeWorkspaceId,
          initialPrompt,
        });
        addTab({
          sessionId: session.id,
          label: session.displayName,
          cliName: session.cliName,
          mode: "Normal",
          type: "chat",
        });
        useAgentStore.getState().addTab({
          sessionId: session.id,
          label: session.displayName,
          cliName: session.cliName,
          mode: selectedChatMode,
          state: "thinking",
          conversationId: null,
          totalCost: 0,
        });
      } else {
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
          type: "terminal",
        });
      }
      useWorkspaceStore.getState().setActivePage("terminals");
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Session</DialogTitle>
          <DialogDescription>
            Select a session type, AI coding CLI, and mode.
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
            {/* Session type toggle */}
            <div className="flex items-center gap-1 rounded-md border bg-muted/50 p-0.5">
              <button
                onClick={() => setSessionType("terminal")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                  sessionType === "terminal"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Terminal className="h-3.5 w-3.5" /> Terminal
              </button>
              <button
                onClick={() => setSessionType("chat")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                  sessionType === "chat"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Chat
              </button>
            </div>

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

            {/* Initial prompt — only for chat mode */}
            {sessionType === "chat" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Prompt</label>
                <textarea
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  placeholder="What would you like the agent to do?"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-y"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Mode</label>
              <div className="grid gap-2">
                {sessionType === "chat"
                  ? CHAT_MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setSelectedChatMode(mode.value)}
                        className={cn(
                          "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                          selectedChatMode === mode.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-foreground/20",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            selectedChatMode === mode.value
                              ? "border-primary"
                              : "border-muted-foreground/40",
                          )}
                        >
                          {selectedChatMode === mode.value && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{mode.label}</p>
                          <p className="text-xs text-muted-foreground">{mode.description}</p>
                        </div>
                      </button>
                    ))
                  : MODE_OPTIONS.map((mode) => (
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
