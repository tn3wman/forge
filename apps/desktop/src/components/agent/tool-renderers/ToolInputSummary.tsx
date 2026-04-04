import { memo } from "react";
import {
  FileText,
  MessageCircleQuestion,
  Pencil,
  FilePlus,
  Terminal,
  Search,
  FolderSearch,
} from "lucide-react";
import { DiffView } from "./DiffView";

interface ToolInputSummaryProps {
  toolName: string;
  toolInput?: Record<string, unknown>;
  toolInputText?: string;
}

function shortenPath(filePath: string | undefined): string {
  if (!filePath) return "unknown";
  const parts = filePath.split("/");
  if (parts.length <= 3) return filePath;
  return ".../" + parts.slice(-3).join("/");
}

function buildEditDiff(oldStr: string, newStr: string): string {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const lines: string[] = [];
  for (const l of oldLines) lines.push(`-${l}`);
  for (const l of newLines) lines.push(`+${l}`);
  return lines.join("\n");
}

export const ToolInputSummary = memo(function ToolInputSummary({
  toolName,
  toolInput,
  toolInputText,
}: ToolInputSummaryProps) {
  if (!toolInput) {
    if (toolInputText) {
      return (
        <pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs">
          <code>{toolInputText}</code>
        </pre>
      );
    }
    return null;
  }

  const name = toolName.toLowerCase();

  if (name === "read") {
    const filePath = toolInput.file_path as string;
    const offset = toolInput.offset as number | undefined;
    const limit = toolInput.limit as number | undefined;
    const range =
      offset || limit
        ? ` (${offset ? `from line ${offset}` : ""}${offset && limit ? ", " : ""}${limit ? `${limit} lines` : ""})`
        : "";
    return (
      <div className="flex items-center gap-2 text-xs">
        <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        <span className="text-muted-foreground">Read</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
          {shortenPath(filePath)}
        </code>
        {range && <span className="text-muted-foreground">{range}</span>}
      </div>
    );
  }

  if (name === "edit") {
    const filePath = toolInput.file_path as string;
    const oldString = toolInput.old_string as string | undefined;
    const newString = toolInput.new_string as string | undefined;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Pencil className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
          <span className="text-muted-foreground">Edit</span>
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
            {shortenPath(filePath)}
          </code>
        </div>
        {oldString != null && newString != null && (
          <div className="max-h-48 overflow-auto">
            <DiffView content={buildEditDiff(oldString, newString)} />
          </div>
        )}
      </div>
    );
  }

  if (name === "write") {
    const filePath = toolInput.file_path as string;
    const content = toolInput.content as string | undefined;
    const bytes = content ? `(${content.length} chars)` : "";
    return (
      <div className="flex items-center gap-2 text-xs">
        <FilePlus className="h-3.5 w-3.5 shrink-0 text-green-400" />
        <span className="text-muted-foreground">Write</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
          {shortenPath(filePath)}
        </code>
        {bytes && <span className="text-muted-foreground">{bytes}</span>}
      </div>
    );
  }

  if (name === "bash") {
    const command = toolInput.command as string;
    const description = toolInput.description as string | undefined;
    return (
      <div className="space-y-1">
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <div className="flex items-start gap-2 rounded bg-background px-2 py-1.5">
          <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
          <code className="text-xs font-mono text-foreground break-all">
            {command}
          </code>
        </div>
      </div>
    );
  }

  if (name === "grep") {
    const pattern = toolInput.pattern as string;
    const path = toolInput.path as string | undefined;
    return (
      <div className="flex items-center gap-2 text-xs">
        <Search className="h-3.5 w-3.5 shrink-0 text-purple-400" />
        <span className="text-muted-foreground">Search for</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
          {pattern}
        </code>
        {path && (
          <>
            <span className="text-muted-foreground">in</span>
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
              {shortenPath(path)}
            </code>
          </>
        )}
      </div>
    );
  }

  if (name === "glob") {
    const pattern = toolInput.pattern as string;
    const path = toolInput.path as string | undefined;
    return (
      <div className="flex items-center gap-2 text-xs">
        <FolderSearch className="h-3.5 w-3.5 shrink-0 text-orange-400" />
        <span className="text-muted-foreground">Find files</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
          {pattern}
        </code>
        {path && (
          <>
            <span className="text-muted-foreground">in</span>
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
              {shortenPath(path)}
            </code>
          </>
        )}
      </div>
    );
  }

  if (name === "askuserquestion") {
    const questions = toolInput.questions as Array<{ question: string; header?: string; options?: Array<{ label: string }> }> | undefined;
    if (Array.isArray(questions)) {
      return (
        <div className="space-y-1 text-xs">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <MessageCircleQuestion className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              <span className="text-foreground">{q.header ?? q.question}</span>
              {q.options && (
                <span className="text-muted-foreground">({q.options.length} options)</span>
              )}
            </div>
          ))}
        </div>
      );
    }
    const question = toolInput.question as string;
    return (
      <div className="flex items-center gap-2 text-xs">
        <MessageCircleQuestion className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        <span className="text-foreground">{question}</span>
      </div>
    );
  }

  // Fallback: compact key-value display instead of raw JSON
  return (
    <div className="space-y-1">
      {Object.entries(toolInput).map(([key, value]) => {
        const strValue =
          typeof value === "string"
            ? value.length > 200
              ? value.slice(0, 200) + "..."
              : value
            : JSON.stringify(value);
        return (
          <div key={key} className="flex gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">{key}:</span>
            <code className="break-all font-mono text-foreground">{strValue}</code>
          </div>
        );
      })}
    </div>
  );
});
