import { useState, useCallback, useRef, useEffect } from "react";
import {
  ArrowUp,
  Square,
  Terminal,
  Loader2,
  ChevronDown,
  FileText,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Gauge,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { AgentSelector } from "./AgentSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgentChatMode, AgentState, SlashCommandInfo, CliInfo, ClaudeEffort } from "@forge/shared";

const MODE_COMMANDS: Record<string, AgentChatMode> = {
  plan: "plan",
  default: "default",
  yolo: "bypassPermissions",
  auto: "auto",
};

const MODE_CONFIG: Record<
  AgentChatMode,
  { label: string; icon: typeof Shield }
> = {
  plan: { label: "Plan", icon: FileText },
  auto: { label: "Auto", icon: ShieldAlert },
  default: { label: "Default", icon: Shield },
  acceptEdits: { label: "Accept edits", icon: ShieldAlert },
  bypassPermissions: { label: "Bypass permissions", icon: ShieldCheck },
  dontAsk: { label: "Don't ask", icon: ShieldCheck },
};

const MODEL_PRESETS = [
  { value: "", label: "Default" },
  { value: "claude-opus-4-6", label: "Opus 4.6" },
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "claude-haiku-4-5", label: "Haiku 4.5" },
];

const EFFORT_OPTIONS: { value: ClaudeEffort; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface UnifiedInputCardProps {
  onSend: (text: string) => void;
  onAbort?: () => void;
  agentState?: AgentState;
  disabled?: boolean;

  mode?: AgentChatMode;
  onModeChange?: (mode: AgentChatMode) => void;

  slashCommands?: SlashCommandInfo[];

  // Model & effort (PreSessionView only)
  model?: string;
  onModelChange?: (model: string) => void;
  effort?: ClaudeEffort;
  onEffortChange?: (effort: ClaudeEffort) => void;

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
  mode = "auto",
  onModeChange,
  slashCommands = [],
  model,
  onModelChange,
  effort,
  onEffortChange,
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

  const currentModeConfig = MODE_CONFIG[mode] ?? MODE_CONFIG.auto;
  const ModeIcon = currentModeConfig.icon;

  const currentModelLabel =
    MODEL_PRESETS.find((p) => p.value === (model ?? ""))?.label ??
    (model || "Default");

  const currentEffortLabel =
    EFFORT_OPTIONS.find((o) => o.value === (effort ?? "medium"))?.label ?? "Medium";

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

          {/* Model selector (PreSessionView only, when Claude) */}
          {onModelChange && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isDisabled}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="font-medium">{currentModelLabel}</span>
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {MODEL_PRESETS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.value}
                      onClick={() => onModelChange(preset.value)}
                      className={cn((model ?? "") === preset.value && "bg-accent")}
                    >
                      {preset.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Separator />
            </>
          )}

          {/* Effort selector (PreSessionView only, when Claude) */}
          {onEffortChange && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isDisabled}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="font-medium">{currentEffortLabel}</span>
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {EFFORT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => onEffortChange(option.value)}
                      className={cn((effort ?? "medium") === option.value && "bg-accent")}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Separator />
            </>
          )}

          {/* Unified mode dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isDisabled}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <ModeIcon className="h-3.5 w-3.5" />
              <span className="font-medium">{currentModeConfig.label}</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => onModeChange?.("plan")}
                className={cn(mode === "plan" && "bg-accent")}
              >
                <FileText className="mr-2 h-3.5 w-3.5" />
                Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onModeChange?.("auto")}
                className={cn(mode === "auto" && "bg-accent")}
              >
                <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                Auto
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onModeChange?.("default")}
                className={cn(mode === "default" && "bg-accent")}
              >
                <Shield className="mr-2 h-3.5 w-3.5" />
                Default
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onModeChange?.("acceptEdits")}
                className={cn(mode === "acceptEdits" && "bg-accent")}
              >
                <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                Accept edits
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onModeChange?.("bypassPermissions")}
                className={cn(mode === "bypassPermissions" && "bg-accent")}
              >
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                Bypass permissions
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onModeChange?.("dontAsk")}
                className={cn(mode === "dontAsk" && "bg-accent")}
              >
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                Don't ask
              </DropdownMenuItem>
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
