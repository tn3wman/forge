import { useState } from "react";
import { Plus, Minus, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useGitStatus } from "@/queries/useGitStatus";
import { useStageFiles, useUnstageFiles, useStageAll } from "@/queries/useGitMutations";
import type { FileStatus } from "@forge/shared";

interface StagingAreaProps {
  localPath: string;
  selectedFile: { path: string; staged: boolean } | null;
  onSelectFile: (path: string, staged: boolean) => void;
}

const STATUS_LETTER: Record<string, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  untracked: "?",
  conflicted: "C",
};

const STATUS_COLOR: Record<string, string> = {
  modified: "text-yellow-400",
  added: "text-green-400",
  deleted: "text-red-400",
  renamed: "text-blue-400",
  untracked: "text-muted-foreground",
  conflicted: "text-orange-400",
};

function splitPath(filePath: string): { dir: string; base: string } {
  const idx = filePath.lastIndexOf("/");
  if (idx === -1) return { dir: "", base: filePath };
  return { dir: filePath.slice(0, idx + 1), base: filePath.slice(idx + 1) };
}

export function StagingArea({ localPath, selectedFile, onSelectFile }: StagingAreaProps) {
  const { data: files = [] } = useGitStatus(localPath);
  const stageFiles = useStageFiles();
  const unstageFiles = useUnstageFiles();
  const stageAll = useStageAll();

  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [stagedOpen, setStagedOpen] = useState(true);

  const unstaged = files.filter((f) => !f.staged);
  const staged = files.filter((f) => f.staged);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Unstaged section */}
      <Section
        title={`Unstaged Changes (${unstaged.length})`}
        open={unstagedOpen}
        onToggle={() => setUnstagedOpen((v) => !v)}
        actionLabel="Stage All"
        actionIcon={<Plus className="h-3 w-3" />}
        actionLoading={stageAll.isPending}
        onAction={() => stageAll.mutate({ path: localPath })}
        files={unstaged}
        selectedFile={selectedFile}
        onSelectFile={(path) => onSelectFile(path, false)}
        onFileAction={(path) => stageFiles.mutate({ path: localPath, paths: [path] })}
        fileActionIcon={<Plus className="h-3 w-3" />}
        fileActionLoading={stageFiles.isPending}
      />

      {/* Staged section */}
      <Section
        title={`Staged Changes (${staged.length})`}
        open={stagedOpen}
        onToggle={() => setStagedOpen((v) => !v)}
        actionLabel="Unstage All"
        actionIcon={<Minus className="h-3 w-3" />}
        actionLoading={unstageFiles.isPending}
        onAction={() => {
          if (staged.length > 0) {
            unstageFiles.mutate({ path: localPath, paths: staged.map((f) => f.path) });
          }
        }}
        files={staged}
        selectedFile={selectedFile}
        onSelectFile={(path) => onSelectFile(path, true)}
        onFileAction={(path) => unstageFiles.mutate({ path: localPath, paths: [path] })}
        fileActionIcon={<Minus className="h-3 w-3" />}
        fileActionLoading={unstageFiles.isPending}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  actionLabel: string;
  actionIcon: React.ReactNode;
  actionLoading: boolean;
  onAction: () => void;
  files: FileStatus[];
  selectedFile: { path: string; staged: boolean } | null;
  onSelectFile: (path: string) => void;
  onFileAction: (path: string) => void;
  fileActionIcon: React.ReactNode;
  fileActionLoading: boolean;
}

function Section({
  title,
  open,
  onToggle,
  actionLabel,
  actionIcon,
  actionLoading,
  onAction,
  files,
  selectedFile,
  onSelectFile,
  onFileAction,
  fileActionIcon,
  fileActionLoading,
}: SectionProps) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-foreground/80"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {title}
        </button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          disabled={files.length === 0 || actionLoading}
        >
          {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : actionIcon}
          {actionLabel}
        </Button>
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto">
          {files.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No changes</p>
          ) : (
            files.map((file) => {
              const { dir, base } = splitPath(file.path);
              const isSelected =
                selectedFile?.path === file.path && selectedFile?.staged === file.staged;
              return (
                <div
                  key={file.path}
                  className={cn(
                    "group flex items-center gap-1.5 px-2 py-0.5 cursor-pointer hover:bg-accent/50",
                    isSelected && "bg-accent",
                  )}
                  onClick={() => onSelectFile(file.path)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-bold",
                      STATUS_COLOR[file.status] ?? "text-muted-foreground",
                    )}
                  >
                    {STATUS_LETTER[file.status] ?? "?"}
                  </span>
                  <span className="flex-1 truncate font-mono text-xs">
                    {dir && <span className="text-muted-foreground">{dir}</span>}
                    <span className="font-semibold">{base}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileAction(file.path);
                    }}
                    disabled={fileActionLoading}
                  >
                    {fileActionIcon}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
