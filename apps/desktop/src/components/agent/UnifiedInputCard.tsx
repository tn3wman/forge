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
  Paperclip,
  X,
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
import type { AgentChatMode, AgentState, SlashCommandInfo, CliInfo, ClaudeEffort, ImageAttachment, ImageMediaType } from "@forge/shared";

const ACCEPTED_IMAGE_TYPES = new Set<string>(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB base64 limit (~3.75MB raw)
const MAX_IMAGES = 5;

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
  onSend: (text: string, images?: ImageAttachment[]) => void;
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
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [slashMenuDismissed, setSlashMenuDismissed] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFiles = useCallback((files: FileList | File[]) => {
    setImageError(null);
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        setImageError(`Unsupported format: ${file.type || "unknown"}. Use PNG, JPEG, GIF, or WebP.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // dataUrl format: "data:image/png;base64,iVBOR..."
        const commaIndex = dataUrl.indexOf(",");
        const base64Data = dataUrl.slice(commaIndex + 1);

        if (base64Data.length > MAX_IMAGE_SIZE_BYTES) {
          setImageError("Image too large (max 5MB). Try a smaller image.");
          return;
        }

        setImages((prev) => {
          if (prev.length >= MAX_IMAGES) {
            setImageError(`Maximum ${MAX_IMAGES} images per message.`);
            return prev;
          }
          return [...prev, {
            data: base64Data,
            mediaType: file.type as ImageMediaType,
            fileName: file.name,
          }];
        });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageError(null);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files?.length) {
      processFiles(Array.from(files).filter((f) => f.type.startsWith("image/")));
    }
  }, [processFiles]);

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
    if (!trimmed && images.length === 0) return;

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

    onSend(trimmed, images.length > 0 ? images : undefined);
    setText("");
    setImages([]);
    setImageError(null);
  }, [text, images, onSend, onAbort, onModeChange, onClear, showConfirmationMsg]);

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
    <div className="shrink-0 px-4 pb-1">
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
          isDragging && "ring-2 ring-primary border-primary",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) processFiles(e.target.files);
            e.target.value = "";
          }}
        />
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
          onPaste={handlePaste}
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

        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-2 px-3 pb-2 overflow-x-auto">
            {images.map((img, i) => (
              <div key={i} className="relative group shrink-0">
                <img
                  src={`data:${img.mediaType};base64,${img.data}`}
                  alt={img.fileName ?? `Image ${i + 1}`}
                  className="h-12 w-12 rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image error */}
        {imageError && (
          <p className="px-3 pb-2 text-xs text-destructive">{imageError}</p>
        )}

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

          {/* Attach image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled || images.length >= MAX_IMAGES}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Attach images"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>

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
              disabled={!text.trim() && images.length === 0}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                text.trim() || images.length > 0
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
