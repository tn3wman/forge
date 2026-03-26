import { useState } from "react";
import { GitMerge, ChevronDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MergeButtonProps {
  mergeable: string;
  onMerge: (method: string) => void;
  isMerging?: boolean;
  state: string;
}

const METHODS: Record<string, string> = {
  merge: "Create a merge commit",
  squash: "Squash and merge",
  rebase: "Rebase and merge",
};

const METHOD_LABELS: Record<string, string> = {
  merge: "Merge pull request",
  squash: "Squash and merge",
  rebase: "Rebase and merge",
};

export function MergeButton({
  mergeable,
  onMerge,
  isMerging = false,
  state,
}: MergeButtonProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("merge");

  if (state === "merged") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/20 px-3 py-1.5 text-sm font-medium text-purple-400">
        <GitMerge className="h-4 w-4" />
        Merged
      </div>
    );
  }

  if (state === "closed") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400">
        Closed
      </div>
    );
  }

  if (mergeable === "CONFLICTING") {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-sm text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          This branch has conflicts that must be resolved
        </div>
        <Button size="sm" disabled>
          Merge pull request
        </Button>
      </div>
    );
  }

  const canMerge = mergeable === "MERGEABLE";

  return (
    <div className="inline-flex items-center">
      <Button
        size="sm"
        disabled={!canMerge || isMerging}
        onClick={() => onMerge(selectedMethod)}
        className="rounded-r-none"
      >
        {isMerging ? "Merging..." : METHOD_LABELS[selectedMethod]}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            disabled={!canMerge || isMerging}
            className={cn("rounded-l-none border-l border-primary-foreground/20 px-2")}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.entries(METHODS).map(([key, label]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => setSelectedMethod(key)}
              className={cn(key === selectedMethod && "bg-accent")}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
