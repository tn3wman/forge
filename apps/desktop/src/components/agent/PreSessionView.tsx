import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCliDiscovery, useSlashCommands } from "@/hooks/useCliDiscovery";
import { useRepositories } from "@/queries/useRepositories";
import { useGitBranches, useCurrentBranch } from "@/queries/useGitBranches";
import { useGitWorktrees } from "@/queries/useGitWorktrees";
import { useTerminalStore } from "@/stores/terminalStore";
import { useAgentStore } from "@/stores/agentStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { agentIpc } from "@/ipc/agent";
import { sessionInfoToPersistedSession, persistSingleMessage } from "@/lib/agentPersistence";
import { gitIpc } from "@/ipc/git";
import { terminalIpc } from "@/ipc/terminal";
import { UnifiedInputCard } from "./UnifiedInputCard";
import { WorkModeSelector, type WorkMode } from "./WorkModeSelector";
import { RepoSetupBar } from "./RepoSetupBar";
import { AgentRepoSelector } from "./AgentRepoSelector";
import { FullAccessConfirmDialog } from "./FullAccessConfirmDialog";
import type { AgentChatMode, ClaudeEffort, WorktreeInfo } from "@forge/shared";

interface PreSessionViewProps {
  tabId: string;
  workspaceId: string;
}

export function PreSessionView({ tabId, workspaceId }: PreSessionViewProps) {
  const queryClient = useQueryClient();
  const { data: clis, isLoading: clisLoading } = useCliDiscovery();
  const { data: repos } = useRepositories(workspaceId);
  const tab = useTerminalStore((s) => s.tabs.find((t) => t.tabId === tabId));
  const reposWithPath = repos?.filter((r): r is typeof r & { localPath: string } => !!r.localPath) ?? [];
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  // Resolve working directory: tab override > selected repo > first linked repo
  const selectedRepo = reposWithPath.find((r) => r.id === selectedRepoId) ?? reposWithPath[0];
  const workingDirectory = tab?.workingDirectory ?? selectedRepo?.localPath ?? undefined;

  const [selectedCli, setSelectedCli] = useState<string | null>(null);
  const [mode, setMode] = useState<AgentChatMode>("assisted");
  const [planMode, setPlanMode] = useState(false);
  const [showFullAccessConfirm, setShowFullAccessConfirm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [model, setModel] = useState("");
  const [agent, setAgent] = useState("");
  const [effort, setEffort] = useState<ClaudeEffort>("medium");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const claudeExecutablePath = useSettingsStore((s) => s.claudeExecutablePath);

  // Work mode & branch/worktree selection
  const [workMode, setWorkMode] = useState<WorkMode>("local");
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedWorktree, setSelectedWorktree] = useState<WorktreeInfo | null>(null);

  const { data: branches, isLoading: branchesLoading } = useGitBranches(workingDirectory ?? null);
  const { data: currentBranch } = useCurrentBranch(workingDirectory ?? null);
  const { data: worktrees, isLoading: worktreesLoading } = useGitWorktrees(workingDirectory ?? null);

  // Auto-select default branch for "new worktree" mode
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranch) {
      const defaultBranch =
        branches.find((b) => !b.isRemote && (b.name === "main" || b.name === "master")) ??
        branches.find((b) => !b.isRemote && b.isHead) ??
        branches.find((b) => !b.isRemote);
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.name);
      }
    }
  }, [branches, selectedBranch]);

  const handleModeChange = useCallback((newMode: AgentChatMode) => {
    if (newMode === "fullAccess" && mode !== "fullAccess") {
      setShowFullAccessConfirm(true);
    } else {
      setMode(newMode);
    }
  }, [mode]);

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
        // Resolve effective working directory based on work mode
        let effectiveWorkDir = workingDirectory;
        if (workMode === "new-worktree" && selectedBranch && workingDirectory) {
          const wt = await gitIpc.createWorktree(workingDirectory, selectedBranch);
          effectiveWorkDir = wt.path;
        } else if (workMode === "existing-worktree" && selectedWorktree) {
          effectiveWorkDir = selectedWorktree.path;
        }

        const session = await agentIpc.createSession({
          cliName: selectedCli,
          mode,
          workingDirectory: effectiveWorkDir,
          workspaceId,
          initialPrompt: text,
          planMode,
          claude: isClaude
            ? {
                provider: "claude",
                model: model.trim() || undefined,
                permissionMode: mode,
                effort,
                planMode,
                agent: agent.trim() || undefined,
                claudePath: effectiveClaudePath || undefined,
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
          workingDirectory: effectiveWorkDir,
          planMode,
          totalCost: 0,
        });

        const userMsg = {
          id: `user-${Date.now()}`,
          type: "user" as const,
          content: text,
          timestamp: Date.now(),
          collapsed: false,
        };
        useAgentStore.getState().appendMessage(session.id, userMsg);
        useAgentStore.getState().createPendingAssistant(session.id);

        // Persist session and initial user message
        {
          const persisted = sessionInfoToPersistedSession(
            session.id,
            workspaceId,
            session.cliName,
            session.displayName,
            mode,
            {
              provider: session.provider ?? (isClaude ? "claude" : undefined),
              model: session.model ?? (model.trim() || undefined),
              permissionMode: session.permissionMode ?? (isClaude ? mode : undefined),
              agent: session.agent ?? (agent.trim() || undefined),
              effort: session.effort ?? (isClaude ? effort : undefined),
              claudePath: session.claudePath ?? (effectiveClaudePath || undefined),
              planMode,
              workingDirectory: effectiveWorkDir,
              conversationId: session.conversationId,
              createdAt: session.createdAt,
            },
          );
          void agentIpc.persistSession(persisted).catch((err) => {
            console.error("Failed to persist session:", err);
          });
          persistSingleMessage(session.id, userMsg);
        }
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
      planMode,
      selectedBranch,
      selectedCli,
      selectedWorktree,
      tabId,
      workMode,
      workingDirectory,
      workspaceId,
    ],
  );

  const handleUnlockWorktree = useCallback(
    async (wt: WorktreeInfo) => {
      if (!workingDirectory) return;
      try {
        await gitIpc.unlockWorktree(workingDirectory, wt.name);
        queryClient.invalidateQueries({ queryKey: ["git-worktrees", workingDirectory] });
      } catch (err) {
        console.error("Failed to unlock worktree:", err);
      }
    },
    [workingDirectory, queryClient],
  );

  const handleOpenTerminal = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const cliName = selectedCli ?? "bash";
      const isCli = cliName === "claude" || cliName === "codex";
      const session = await terminalIpc.createSession({
        cliName,
        mode: "Normal",
        workspaceId,
        workingDirectory,
        permissionMode: isCli ? mode : undefined,
        planMode: isCli ? planMode : undefined,
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
  }, [selectedCli, workspaceId, workingDirectory, tabId, creating, mode, planMode]);

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

      <div className="shrink-0">
        <UnifiedInputCard
          onSend={handleSend}
          disabled={creating}
          mode={mode}
          onModeChange={handleModeChange}
          planMode={planMode}
          onPlanModeChange={setPlanMode}
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

        {reposWithPath.length > 1 && (
          <AgentRepoSelector
            repos={reposWithPath}
            selectedRepoId={selectedRepo?.id ?? null}
            onSelect={setSelectedRepoId}
          />
        )}

        {workingDirectory ? (
          <WorkModeSelector
            workMode={workMode}
            onWorkModeChange={setWorkMode}
            currentBranch={currentBranch ?? null}
            branches={branches ?? []}
            branchesLoading={branchesLoading}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            worktrees={worktrees ?? []}
            worktreesLoading={worktreesLoading}
            selectedWorktree={selectedWorktree}
            onWorktreeChange={setSelectedWorktree}
            onUnlockWorktree={handleUnlockWorktree}
            disabled={creating}
          />
        ) : (
          <RepoSetupBar
            workspaceId={workspaceId}
            repos={repos ?? []}
            disabled={creating}
          />
        )}
      </div>

      <FullAccessConfirmDialog
        open={showFullAccessConfirm}
        onConfirm={() => {
          setMode("fullAccess");
          setShowFullAccessConfirm(false);
        }}
        onCancel={() => setShowFullAccessConfirm(false)}
      />
    </div>
  );
}
