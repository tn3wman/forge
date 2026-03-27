import { memo } from "react";
import { cn } from "@/lib/utils";

interface DiffViewProps {
  content: string;
}

type LineType = "add" | "remove" | "context" | "header" | "meta";

function classifyLine(line: string): LineType {
  if (line.startsWith("@@")) return "header";
  if (line.startsWith("+++") || line.startsWith("---")) return "meta";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "remove";
  return "context";
}

export const DiffView = memo(function DiffView({ content }: DiffViewProps) {
  const lines = content.split("\n");

  return (
    <div className="overflow-auto rounded bg-background text-xs font-mono">
      {lines.map((line, i) => {
        const type = classifyLine(line);
        return (
          <div
            key={i}
            className={cn(
              "px-2 whitespace-pre",
              type === "add" && "bg-green-500/15 text-green-400",
              type === "remove" && "bg-red-500/15 text-red-400",
              type === "header" && "bg-blue-500/10 text-blue-400",
              type === "meta" && "text-muted-foreground",
              type === "context" && "text-muted-foreground",
            )}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
});
