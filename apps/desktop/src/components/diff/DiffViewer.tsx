import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { PrFile } from "@forge/shared";

interface DiffViewerProps {
  files: PrFile[];
  selectedFile?: string;
}

export function DiffViewer({ files, selectedFile }: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedFile || !containerRef.current) return;
    const el = containerRef.current.querySelector(
      `[data-file-path="${CSS.escape(selectedFile)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedFile]);

  if (!files.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No files changed.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {files.map((file) => (
        <DiffBlock key={file.path} file={file} isSelected={file.path === selectedFile} />
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  added: "text-green-400",
  removed: "text-red-400",
  modified: "text-yellow-400",
  renamed: "text-blue-400",
};

function DiffBlock({ file, isSelected }: { file: PrFile; isSelected: boolean }) {
  const lines = parsePatch(file.patch);

  return (
    <div
      data-file-path={file.path}
      className={cn(
        "overflow-hidden rounded-md border border-border",
        isSelected && "ring-1 ring-primary",
      )}
    >
      {/* File header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
        <StatusBadge status={file.status} />
        <span className="truncate text-xs font-mono text-foreground">
          {file.previousPath && file.status === "renamed" ? (
            <>
              <span className="text-muted-foreground">{file.previousPath}</span>
              <span className="text-muted-foreground"> → </span>
              {file.path}
            </>
          ) : (
            file.path
          )}
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-xs tabular-nums">
          {file.additions > 0 && (
            <span className="text-green-400">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-red-400">-{file.deletions}</span>
          )}
        </div>
      </div>

      {/* Diff content */}
      {file.patch ? (
        <div className="overflow-x-auto">
          <pre className="text-xs leading-5">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, i) => (
                  <tr
                    key={i}
                    className={cn(
                      line.type === "add" && "bg-green-500/10",
                      line.type === "del" && "bg-red-500/10",
                      line.type === "hunk" && "bg-blue-500/10",
                    )}
                  >
                    <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap">
                      {line.oldNum ?? ""}
                    </td>
                    <td className="select-none px-2 text-right text-muted-foreground/50 font-mono w-[1%] whitespace-nowrap">
                      {line.newNum ?? ""}
                    </td>
                    <td
                      className={cn(
                        "px-3 font-mono whitespace-pre",
                        line.type === "add" && "text-green-300",
                        line.type === "del" && "text-red-300",
                        line.type === "hunk" && "text-blue-300",
                        line.type === "ctx" && "text-foreground/80",
                      )}
                    >
                      {line.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </pre>
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-muted-foreground italic">
          Binary file or no diff available
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const letter = status === "renamed" ? "R" : status.charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold",
        STATUS_COLORS[status] ?? "text-muted-foreground",
      )}
    >
      {letter}
    </span>
  );
}

interface DiffLine {
  type: "add" | "del" | "ctx" | "hunk";
  content: string;
  oldNum: number | null;
  newNum: number | null;
}

function parsePatch(patch: string): DiffLine[] {
  if (!patch) return [];

  const rawLines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const raw of rawLines) {
    if (raw.startsWith("@@")) {
      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const match = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: "hunk", content: raw, oldNum: null, newNum: null });
    } else if (raw.startsWith("+")) {
      result.push({ type: "add", content: raw, oldNum: null, newNum: newLine });
      newLine++;
    } else if (raw.startsWith("-")) {
      result.push({ type: "del", content: raw, oldNum: oldLine, newNum: null });
      oldLine++;
    } else {
      result.push({ type: "ctx", content: raw, oldNum: oldLine, newNum: newLine });
      oldLine++;
      newLine++;
    }
  }

  return result;
}
