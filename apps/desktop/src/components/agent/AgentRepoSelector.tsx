import { Database, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Repository } from "@forge/shared";

interface AgentRepoSelectorProps {
  repos: (Repository & { localPath: string })[];
  selectedRepoId: string | null;
  onSelect: (repoId: string) => void;
}

export function AgentRepoSelector({ repos, selectedRepoId, onSelect }: AgentRepoSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = repos.find((r) => r.id === selectedRepoId) ?? repos[0];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!selected) return null;

  return (
    <div ref={ref} className="relative flex items-center justify-center px-5 pb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Database className="h-3 w-3" />
        <span className="font-mono truncate max-w-[200px]">{selected.fullName}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 min-w-[220px] max-h-[200px] overflow-y-auto rounded-md border bg-popover shadow-md">
          {repos.map((repo) => (
            <button
              key={repo.id}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors font-mono",
                repo.id === selected.id && "bg-accent text-accent-foreground",
              )}
              onClick={() => {
                onSelect(repo.id);
                setOpen(false);
              }}
            >
              {repo.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
