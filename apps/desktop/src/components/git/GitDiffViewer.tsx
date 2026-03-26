import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiffEntry, DiffHunk, DiffLine } from "@forge/shared";

interface GitDiffViewerProps {
  entries: DiffEntry[];
  selectedFile?: string;
}

const STATUS_COLORS: Record<string, string> = {
  added: "text-green-400",
  modified: "text-yellow-400",
  deleted: "text-red-400",
  renamed: "text-blue-400",
};

export function GitDiffViewer({ entries, selectedFile }: GitDiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedFile || !containerRef.current) return;
    const el = containerRef.current.querySelector(
      `[data-file-path="${CSS.escape(selectedFile)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedFile]);

  if (!entries.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No diff to display. Select a file to view changes.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {entries.map((entry) => (
        <DiffBlock
          key={entry.path}
          entry={entry}
          isSelected={entry.path === selectedFile}
        />
      ))}
    </div>
  );
}

function DiffBlock({ entry, isSelected }: { entry: DiffEntry; isSelected: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      data-file-path={entry.path}
      className={cn(
        "overflow-hidden rounded-md border border-border",
        isSelected && "ring-1 ring-primary",
      )}
    >
      {/* File header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5 text-left"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <StatusBadge status={entry.status} />
        <span className="truncate text-xs font-mono text-foreground">{entry.path}</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs tabular-nums">
          {entry.additions > 0 && (
            <span className="text-green-400">+{entry.additions}</span>
          )}
          {entry.deletions > 0 && (
            <span className="text-red-400">-{entry.deletions}</span>
          )}
        </div>
      </button>

      {/* Diff content */}
      {!collapsed && (
        entry.hunks.length > 0 ? (
          <div className="overflow-x-auto">
            <pre className="text-xs leading-5">
              <table className="w-full border-collapse">
                <tbody>
                  {entry.hunks.map((hunk, hi) => (
                    <HunkBlock key={hi} hunk={hunk} />
                  ))}
                </tbody>
              </table>
            </pre>
          </div>
        ) : (
          <div className="px-3 py-2 text-xs text-muted-foreground italic">
            Binary file or no diff available
          </div>
        )
      )}
    </div>
  );
}

function HunkBlock({ hunk }: { hunk: DiffHunk }) {
  return (
    <>
      <tr className="bg-blue-500/10">
        <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap" />
        <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap" />
        <td className="px-3 font-mono whitespace-pre text-blue-300">{hunk.header}</td>
      </tr>
      {hunk.lines.map((line, li) => (
        <DiffLineRow key={li} line={line} />
      ))}
    </>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const type = line.origin === "+" ? "add" : line.origin === "-" ? "del" : "ctx";

  return (
    <tr
      className={cn(
        type === "add" && "bg-green-500/10",
        type === "del" && "bg-red-500/10",
      )}
    >
      <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap">
        {line.oldLineNo ?? ""}
      </td>
      <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap">
        {line.newLineNo ?? ""}
      </td>
      <td
        className={cn(
          "px-3 font-mono whitespace-pre",
          type === "add" && "text-green-300",
          type === "del" && "text-red-300",
          type === "ctx" && "text-foreground/80",
        )}
      >
        {line.content}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const letter = status === "renamed" ? "R" : status.charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold",
        STATUS_COLORS[status] ?? "text-muted-foreground",
      )}
    >
      {letter}
    </span>
  );
}
