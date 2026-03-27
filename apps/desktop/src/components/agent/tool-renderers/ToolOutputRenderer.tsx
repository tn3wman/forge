import { memo, useMemo } from "react";
import { DiffView } from "./DiffView";
import { detectLanguage } from "@/lib/languageDetect";

interface ToolOutputRendererProps {
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  isStreaming?: boolean;
  isError?: boolean;
}

type ContentType = "diff" | "code" | "text";

function detectContentType(content: string, toolName?: string): ContentType {
  const lines = content.split("\n", 10);
  const hasDiffMarkers = lines.some(
    (l) =>
      l.startsWith("---") ||
      l.startsWith("+++") ||
      l.startsWith("@@") ||
      l.startsWith("diff --git"),
  );
  if (hasDiffMarkers) return "diff";
  if (toolName?.toLowerCase() === "read") return "code";
  return "text";
}

export const ToolOutputRenderer = memo(function ToolOutputRenderer({
  content,
  toolName,
  toolInput,
  isStreaming,
  isError,
}: ToolOutputRendererProps) {
  const contentType = useMemo(
    () => detectContentType(content, toolName),
    [content, toolName],
  );

  const language = useMemo(() => {
    if (contentType !== "code") return undefined;
    const filePath = toolInput?.file_path as string | undefined;
    return filePath ? detectLanguage(filePath) : undefined;
  }, [contentType, toolInput]);

  if (isError) {
    return (
      <pre className="max-h-48 overflow-auto rounded bg-red-500/10 p-2 text-xs text-red-400">
        <code>{content}</code>
      </pre>
    );
  }

  if (contentType === "diff") {
    return (
      <div className="max-h-48 overflow-auto">
        <DiffView content={content} />
      </div>
    );
  }

  if (contentType === "code" && language && !isStreaming) {
    return (
      <pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs">
        <code className={`language-${language}`}>{content}</code>
      </pre>
    );
  }

  return (
    <pre className="max-h-48 overflow-auto rounded bg-background p-2 text-xs">
      <code>{content}</code>
    </pre>
  );
});
