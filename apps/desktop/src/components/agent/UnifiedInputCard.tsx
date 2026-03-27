import { useState, useCallback, useRef, useEffect } from "react";
import {
  ArrowUp,
  Square,
  Terminal,
  Loader2,
  ChevronDown,
  MessageSquare,
  FileText,
  ShieldCheck,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { AgentSelector } from "./AgentSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgentChatMode, AgentState, SlashCommandInfo, CliInfo } from "@forge/shared";

type SessionType = "chat" | "plan";
type AccessLevel = "supervised" | "acceptEdits" | "full-access";
type ModeVariant = "legacy" | "claude";

const ACCESS_TO_MODE: Record<AccessLevel, AgentChatMode> = {
  supervised: "default",
  acceptEdits: "acceptEdits",
  "full-access": "auto",
};

const MODE_TO_ACCESS: Partial<Record<AgentChatMode, AccessLevel>> = {
  default: "supervised",
  acceptEdits: "acceptEdits",
  auto: "full-access",
  bypassPermissions: "full-access",
};

const MODE_COMMANDS: Record<string, AgentChatMode> = {
  plan: "plan",
  default: "default",
  yolo: "bypassPermissions",
  auto: "auto",
};

const CLAUDE_PERMISSION_LABELS: Record<
  Exclude<AgentChatMode, "plan">,
  { label: string; icon: typeof Shield }
> = {
  default: { label: "Default", icon: Shield },
  acceptEdits: { label: "Accept edits", icon: ShieldAlert },
  bypassPermissions: { label: "Bypass permissions", icon: ShieldCheck },
  dontAsk: { label: "Don't ask", icon: ShieldCheck },
  auto: { label: "Auto", icon: ShieldAlert },
};

interface UnifiedInputCardProps {
  onSend: (text: string) => void;
  onAbort?: () => void;
  agentState?: AgentState;
  disabled?: boolean;

  mode?: AgentChatMode;
  onModeChange?: (mode: AgentChatMode) => void;
  modeVariant?: ModeVariant;

  cliName?: string | null;
  slashCommands?: SlashCommandInfo[];

  // PreSessionView-only sections
  showAgentSelector?: boolean;
  clis?: CliInfo[];
  selectedCli?: string | null;
  onSelectCli?: (cli: string) => void;
  clisLoading?: boolean;

  showTerminalButton?: boolean;
  onOpenTerminal?: () => void;

  onFocusChange?: (focused: boolean) => void;
  onClear?: () => void;
}

export function UnifiedInputCard({
  onSend,
  onAbort,
  agentState,
  disabled,
  mode = "default",
  onModeChange,
  modeVariant = "legacy",
  slashCommands = [],
  showAgentSelector,
  clis,
  selectedCli,
  onSelectCli,
  clisLoading,
  showTerminalButton,
  onOpenTerminal,
  onFocusChange,
  onClear,
}: UnifiedInputCardProps) {
  const [text, setText] = useState("");
  const [slashMenuDismissed, setSlashMenuDismissed] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isRunning = agentState === "thinking" || agentState === "executing";
  const showSlashMenu =
    text.startsWith("/") && !text.includes(" ") && !slashMenuDismissed;
  const slashFilter = text.slice(1);

  // Derive session type and access level from mode
  const sessionType: SessionType = mode === "plan" ? "plan" : "chat";
  const accessLevel: AccessLevel =
    MODE_TO_ACCESS[mode] ?? "supervised";
  const claudePermissionMode =
    mode === "plan" ? "default" : mode;

  useEffect(() => {
    if (!text.startsWith("/")) {
      setSlashMenuDismissed(false);
    }
  }, [text]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const showConfirmationMsg = useCallback((msg: string) => {
    setConfirmation(msg);
    setTimeout(() => setConfirmation(null), 1000);
  }, []);

  const resolveMode = useCallback(
    (type: SessionType, access: AccessLevel): AgentChatMode => {
      if (type === "plan") return "plan";
      return ACCESS_TO_MODE[access];
    },
    [],
  );

  const handleSessionTypeChange = useCallback(
    (type: SessionType) => {
      if (modeVariant === "claude") {
        onModeChange?.(type === "plan" ? "plan" : mode === "plan" ? "default" : mode);
        return;
      }
      onModeChange?.(resolveMode(type, accessLevel));
    },
    [accessLevel, mode, modeVariant, onModeChange, resolveMode],
  );

  const handleAccessLevelChange = useCallback(
    (access: AccessLevel) => {
      onModeChange?.(resolveMode(sessionType, access));
    },
    [onModeChange, resolveMode, sessionType],
  );

  const handleClaudePermissionModeChange = useCallback(
    (nextMode: Exclude<AgentChatMode, "plan">) => {
      onModeChange?.(nextMode);
    },
    [onModeChange],
  );

  const handleSlashCommandSelect = useCallback(
    (cmd: SlashCommandInfo) => {
      if (cmd.category === "local") {
        switch (cmd.name) {
          case "clear":
            onClear?.();
            showConfirmationMsg("Messages cleared");
            break;
          case "abort":
            onAbort?.();
            break;
          default: {
            const m = MODE_COMMANDS[cmd.name];
            if (m) {
              onModeChange?.(m);
              showConfirmationMsg(`Mode changed to ${m}`);
            }
          }
        }
      } else {
        onSend(`/${cmd.name}`);
      }
      setText("");
    },
    [onClear, onAbort, onModeChange, onSend, showConfirmationMsg],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();

    if (lower === "/clear") {
      onClear?.();
      setText("");
      showConfirmationMsg("Messages cleared");
      return;
    }

    if (lower === "/abort") {
      onAbort?.();
      setText("");
      return;
    }

    const modeCmd = MODE_COMMANDS[lower.slice(1)];
    if (lower.startsWith("/") && modeCmd) {
      onModeChange?.(modeCmd);
      setText("");
      showConfirmationMsg(`Mode changed to ${modeCmd}`);
      return;
    }

    onSend(trimmed);
    setText("");
  }, [text, onSend, onAbort, onModeChange, onClear, showConfirmationMsg]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSlashMenu) {
          e.preventDefault();
          setSlashMenuDismissed(true);
          return;
        }
        if (isRunning) {
          e.preventDefault();
          onAbort?.();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isRunning, onAbort, showSlashMenu],
  );

  const isDisabled = disabled || (showAgentSelector && !selectedCli);
  const claudePermissionUi =
    modeVariant === "claude" ? CLAUDE_PERMISSION_LABELS[claudePermissionMode] : null;
  const ClaudePermissionIcon = claudePermissionUi?.icon ?? Shield;

  return (
    <div className="shrink-0 px-4 pb-4">
      {confirmation && (
        <div className="flex justify-center pb-2">
          <div className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground animate-in fade-in zoom-in duration-150">
            {confirmation}
          </div>
        </div>
      )}
      <div
        className={cn(
          "relative rounded-xl border border-border bg-muted/30",
          "focus-within:ring-1 focus-within:ring-ring focus-within:border-ring",
          "transition-colors",
        )}
      >
        <SlashCommandMenu
          filter={slashFilter}
          commands={slashCommands}
          onSelect={handleSlashCommandSelect}
          onDismiss={() => setSlashMenuDismissed(true)}
          visible={showSlashMenu}
        />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          rows={2}
          disabled={isDisabled}
          placeholder={
            isRunning
              ? "Agent is working..."
              : "Ask for follow-up changes or attach images"
          }
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm",
            "placeholder:text-muted-foreground/50 focus:outline-none",
            isDisabled && "opacity-50 cursor-not-allowed",
          )}
        />

        {/* Controls row */}
        <div className="flex items-center gap-0 px-3 pb-3">
          {/* Agent selector (PreSessionView only) */}
          {showAgentSelector && (
            <>
              {clisLoading ? (
                <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              ) : (
                <AgentSelector
                  clis={clis ?? []}
                  selected={selectedCli ?? null}
                  onSelect={onSelectCli ?? (() => {})}
                  disabled={isDisabled}
                />
              )}
              <Separator />
            </>
          )}

          {/* Session type: Chat / Plan */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isDisabled}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {sessionType === "chat" ? (
                <MessageSquare className="h-3.5 w-3.5" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              <span className="font-medium capitalize">{sessionType}</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => handleSessionTypeChange("chat")}
                className={cn(sessionType === "chat" && "bg-accent")}
              >
                <MessageSquare className="mr-2 h-3.5 w-3.5" />
                Chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSessionTypeChange("plan")}
                className={cn(sessionType === "plan" && "bg-accent")}
              >
                <FileText className="mr-2 h-3.5 w-3.5" />
                Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator />

          {/* Access level */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isDisabled || sessionType === "plan"}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {modeVariant === "claude" ? (
                <ClaudePermissionIcon className="h-3.5 w-3.5" />
              ) : accessLevel === "full-access" ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : accessLevel === "acceptEdits" ? (
                <ShieldAlert className="h-3.5 w-3.5" />
              ) : (
                <Shield className="h-3.5 w-3.5" />
              )}
              <span className="font-medium">
                {modeVariant === "claude"
                  ? claudePermissionUi?.label
                  : accessLevel === "full-access"
                    ? "Full access"
                    : accessLevel === "acceptEdits"
                      ? "Auto-accept edits"
                      : "Supervised"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {modeVariant === "claude" ? (
                <>
                  {(
                    Object.entries(CLAUDE_PERMISSION_LABELS) as [
                      Exclude<AgentChatMode, "plan">,
                      { label: string; icon: typeof Shield },
                    ][]
                  ).map(([permission, config]) => (
                    <DropdownMenuItem
                      key={permission}
                      onClick={() => handleClaudePermissionModeChange(permission)}
                      className={cn(claudePermissionMode === permission && "bg-accent")}
                    >
                      <config.icon className="mr-2 h-3.5 w-3.5" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleAccessLevelChange("supervised")}
                    className={cn(accessLevel === "supervised" && "bg-accent")}
                  >
                    <Shield className="mr-2 h-3.5 w-3.5" />
                    Supervised
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAccessLevelChange("acceptEdits")}
                    className={cn(accessLevel === "acceptEdits" && "bg-accent")}
                  >
                    <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                    Auto-accept edits
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAccessLevelChange("full-access")}
                    className={cn(accessLevel === "full-access" && "bg-accent")}
                  >
                    <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                    Full access
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Terminal button (PreSessionView only) */}
          {showTerminalButton && (
            <>
              <Separator />
              <button
                onClick={onOpenTerminal}
                disabled={isDisabled}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span className="font-medium">Terminal</span>
              </button>
            </>
          )}

          <div className="flex-1" />

          {/* Send / Abort button */}
          {isRunning ? (
            <button
              type="button"
              onClick={() => onAbort?.()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : isDisabled ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim()}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                text.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="mx-1 h-4 w-px bg-border" />;
}
