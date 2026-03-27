import { ChevronDown, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CliInfo } from "@forge/shared";

interface AgentSelectorProps {
  clis: CliInfo[];
  selected: string | null;
  onSelect: (cliName: string) => void;
  disabled?: boolean;
}

export function AgentSelector({ clis, selected, onSelect, disabled }: AgentSelectorProps) {
  const selectedCli = clis.find((c) => c.name === selected);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || clis.length === 0}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
          "text-muted-foreground hover:text-foreground",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        <Terminal className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate max-w-[140px]">
          {selectedCli?.displayName ?? "Select agent..."}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {clis.map((cli) => (
          <DropdownMenuItem
            key={cli.name}
            onClick={() => onSelect(cli.name)}
            className={cn(
              "flex items-center gap-2",
              cli.name === selected && "bg-accent",
            )}
          >
            <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <span className="text-sm">{cli.displayName}</span>
              {cli.version && (
                <span className="ml-1.5 text-xs text-muted-foreground">v{cli.version}</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
