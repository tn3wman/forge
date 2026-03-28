import { FolderOpen, GitBranch, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BranchInfo, WorktreeInfo } from "@forge/shared";

export type WorkMode = "local" | "new-worktree" | "existing-worktree";

interface WorkModeSelectorProps {
  workMode: WorkMode;
  onWorkModeChange: (mode: WorkMode) => void;

  // Branch data
  currentBranch: string | null;
  branches: BranchInfo[];
  branchesLoading?: boolean;
  selectedBranch: string | null;
  onBranchChange: (branch: string) => void;

  // Worktree data
  worktrees: WorktreeInfo[];
  worktreesLoading?: boolean;
  selectedWorktree: WorktreeInfo | null;
  onWorktreeChange: (wt: WorktreeInfo) => void;

  disabled?: boolean;
}

const MODE_OPTIONS: { value: WorkMode; label: string; icon: typeof FolderOpen }[] = [
  { value: "local", label: "Local", icon: FolderOpen },
  { value: "new-worktree", label: "New worktree", icon: GitBranch },
  { value: "existing-worktree", label: "Existing worktree", icon: GitBranch },
];

export function WorkModeSelector({
  workMode,
  onWorkModeChange,
  currentBranch,
  branches,
  branchesLoading,
  selectedBranch,
  onBranchChange,
  worktrees,
  worktreesLoading,
  selectedWorktree,
  onWorktreeChange,
  disabled,
}: WorkModeSelectorProps) {
  const nonMainWorktrees = worktrees.filter((wt) => !wt.isMain);
  const hasExistingWorktrees = nonMainWorktrees.length > 0;

  const currentMode = MODE_OPTIONS.find((o) => o.value === workMode) ?? MODE_OPTIONS[0];
  const ModeIcon = currentMode.icon;

  // All modes always shown; "existing worktree" disabled when none exist
  const availableModes = MODE_OPTIONS;

  // Right-side label depends on mode
  let rightLabel: string;
  let rightLoading = false;

  switch (workMode) {
    case "local":
      rightLabel = currentBranch ?? "detached";
      rightLoading = branchesLoading ?? false;
      break;
    case "new-worktree":
      rightLabel = selectedBranch ? `From ${selectedBranch}` : "Select branch";
      rightLoading = branchesLoading ?? false;
      break;
    case "existing-worktree":
      rightLabel = selectedWorktree?.branch ?? selectedWorktree?.name ?? "Select worktree";
      rightLoading = worktreesLoading ?? false;
      break;
  }

  return (
    <div className="flex items-center justify-between px-5 pb-3">
      {/* Left: Work mode dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <ModeIcon className="h-3.5 w-3.5" />
          <span className="font-medium">{currentMode.label}</span>
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {availableModes.map((option, idx) => {
            const isExistingWt = option.value === "existing-worktree";
            const isDisabled = isExistingWt && !hasExistingWorktrees;
            return (
              <div key={option.value}>
                {idx > 0 && isExistingWt && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => !isDisabled && onWorkModeChange(option.value)}
                  disabled={isDisabled}
                  className={cn(
                    workMode === option.value && "bg-accent",
                    isDisabled && "opacity-50",
                  )}
                >
                  <option.icon className="mr-2 h-3.5 w-3.5" />
                  {option.label}
                  {isDisabled && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground/50">
                      (none)
                    </span>
                  )}
                </DropdownMenuItem>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Right: Branch / worktree context */}
      {rightLoading ? (
        <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground/60">
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      ) : workMode === "local" ? (
        // Local mode: read-only branch indicator
        <span className="text-xs text-muted-foreground/70 font-medium">
          {rightLabel}
        </span>
      ) : workMode === "new-worktree" ? (
        // New worktree mode: branch selector
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <span className="font-medium">{rightLabel}</span>
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
            {branches.map((branch) => (
              <DropdownMenuItem
                key={`${branch.isRemote ? "r" : "l"}-${branch.name}`}
                onClick={() => onBranchChange(branch.name)}
                className={cn(
                  selectedBranch === branch.name && "bg-accent",
                  branch.isRemote && "text-muted-foreground",
                )}
              >
                {branch.isRemote ? (
                  <span className="text-muted-foreground/60 mr-1">remote/</span>
                ) : null}
                {branch.name}
                {branch.isHead && (
                  <span className="ml-2 text-muted-foreground/50 text-[10px]">HEAD</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        // Existing worktree mode: worktree selector
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled || nonMainWorktrees.length === 0}
            className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <span className="font-medium">{rightLabel}</span>
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
            {nonMainWorktrees.map((wt) => (
              <DropdownMenuItem
                key={wt.name}
                onClick={() => onWorktreeChange(wt)}
                disabled={wt.isLocked}
                className={cn(
                  selectedWorktree?.name === wt.name && "bg-accent",
                  wt.isLocked && "opacity-50",
                )}
              >
                <GitBranch className="mr-2 h-3.5 w-3.5" />
                {wt.branch ?? wt.name}
                {wt.isLocked && (
                  <span className="ml-2 text-muted-foreground/50 text-[10px]">locked</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
