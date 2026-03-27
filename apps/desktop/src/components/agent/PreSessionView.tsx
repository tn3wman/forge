import { useState, useCallback, useEffect } from "react";
import { useCliDiscovery, useSlashCommands } from "@/hooks/useCliDiscovery";
import { useRepositories } from "@/queries/useRepositories";
import { useTerminalStore } from "@/stores/terminalStore";
import { useAgentStore } from "@/stores/agentStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { agentIpc } from "@/ipc/agent";
import { terminalIpc } from "@/ipc/terminal";
import { UnifiedInputCard } from "./UnifiedInputCard";
import type { AgentChatMode, ClaudeEffort } from "@forge/shared";

interface PreSessionViewProps {
  tabId: string;
  workspaceId: string;
}

export function PreSessionView({ tabId, workspaceId }: PreSessionViewProps) {
  const { data: clis, isLoading: clisLoading } = useCliDiscovery();
  const { data: repos } = useRepositories(workspaceId);
  const workingDirectory = repos?.find((r) => r.localPath)?.localPath ?? undefined;

  const [selectedCli, setSelectedCli] = useState<string | null>(null);
  const [mode, setMode] = useState<AgentChatMode>("auto");
  const [creating, setCreating] = useState(false);
  const [model, setModel] = useState("");
  const [agent, setAgent] = useState("");
  const [effort, setEffort] = useState<ClaudeEffort>("medium");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const claudeExecutablePath = useSettingsStore((s) => s.claudeExecutablePath);

  const { data: slashCommands } = useSlashCommands(selectedCli);
  const selectedCliInfo = clis?.find((cli) => cli.name === selectedCli);
  const isClaude = selectedCli === "claude";
  const effectiveClaudePath = claudeExecutablePath.trim() || selectedCliInfo?.path || "";

  // Auto-select first CLI when discovered
  useEffect(() => {
    if (clis && clis.length > 0 && !selectedCli) {
      setSelectedCli(clis[0].name);
    }
  }, [clis, selectedCli]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!selectedCli || creating) return;

      setCreating(true);
      setLaunchError(null);
      try {
        const session = await agentIpc.createSession({
          cliName: selectedCli,
          mode,
          workingDirectory,
          workspaceId,
          initialPrompt: text,
          claude: isClaude
            ? {
                provider: "claude",
                model: model.trim() || undefined,
                permissionMode: mode,
                effort,
                agent: agent.trim() || undefined,
                claudePath: claudeExecutablePath.trim() || undefined,
              }
            : undefined,
        });

        useTerminalStore.getState().activateTab(tabId, session.id, {
          label: session.displayName,
          cliName: session.cliName,
          type: "chat",
        });

        useAgentStore.getState().addTab({
          sessionId: session.id,
          label: session.displayName,
          cliName: session.cliName,
          mode,
          state: "thinking",
          conversationId: session.conversationId ?? null,
          provider: session.provider ?? (isClaude ? "claude" : undefined),
          model: session.model ?? (model.trim() || undefined),
          permissionMode: session.permissionMode ?? (isClaude ? mode : undefined),
          agent: session.agent ?? (agent.trim() || undefined),
          effort: session.effort ?? (isClaude ? effort : undefined),
          claudePath: session.claudePath ?? (effectiveClaudePath || undefined),
          capabilitiesLoaded: session.capabilitiesLoaded,
          totalCost: 0,
        });

        useAgentStore.getState().appendMessage(session.id, {
          id: `user-${Date.now()}`,
          type: "user",
          content: text,
          timestamp: Date.now(),
          collapsed: false,
        });
        useAgentStore.getState().createPendingAssistant(session.id);
      } catch (err) {
        console.error("Failed to create agent session:", err);
        setLaunchError(err instanceof Error ? err.message : String(err));
        setCreating(false);
      }
    },
    [
      agent,
      claudeExecutablePath,
      creating,
      effectiveClaudePath,
      effort,
      isClaude,
      mode,
      model,
      selectedCli,
      tabId,
      workingDirectory,
      workspaceId,
    ],
  );

  const handleOpenTerminal = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const cliName = selectedCli ?? "bash";
      const session = await terminalIpc.createSession({
        cliName,
        mode: "Normal",
        workspaceId,
        workingDirectory,
      });

      useTerminalStore.getState().activateTab(tabId, session.id, {
        label: session.displayName,
        cliName: session.cliName,
        type: "terminal",
        mode: session.mode,
      });
    } catch (err) {
      console.error("Failed to create terminal session:", err);
      setCreating(false);
    }
  }, [selectedCli, workspaceId, workingDirectory, tabId, creating]);

  return (
    <div className="flex h-full flex-col">
      {/* Spacer pushes input to bottom */}
      <div className="flex-1" />

      <div className="flex justify-center pb-4">
        <p className="text-sm text-muted-foreground/50">
          Send a message to start the conversation.
        </p>
      </div>

      {launchError && (
        <div className="mx-4 mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {launchError}
        </div>
      )}

      <UnifiedInputCard
        onSend={handleSend}
        disabled={creating}
        mode={mode}
        onModeChange={setMode}
        slashCommands={slashCommands ?? []}
        model={isClaude ? model : undefined}
        onModelChange={isClaude ? setModel : undefined}
        effort={isClaude ? effort : undefined}
        onEffortChange={isClaude ? setEffort : undefined}
        showAgentSelector
        clis={clis ?? []}
        selectedCli={selectedCli}
        onSelectCli={setSelectedCli}
        clisLoading={clisLoading}
        showTerminalButton
        onOpenTerminal={handleOpenTerminal}
      />
    </div>
  );
}
