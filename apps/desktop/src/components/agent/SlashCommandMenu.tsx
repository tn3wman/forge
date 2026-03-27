import { useRef, useEffect } from "react";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { SlashCommandInfo } from "@forge/shared";

/** Local-only commands handled by the app, not sent to the agent */
export const LOCAL_COMMANDS: SlashCommandInfo[] = [
  { name: "clear", description: "Clear chat history", category: "local" },
  { name: "abort", description: "Stop the running agent", category: "local" },
  { name: "plan", description: "Switch to Plan mode", category: "local" },
  { name: "default", description: "Switch to Default mode", category: "local" },
  { name: "yolo", description: "Switch to BypassPermissions mode", category: "local" },
  { name: "auto", description: "Switch to Auto mode", category: "local" },
];

interface SlashCommandMenuProps {
  filter: string;
  commands: SlashCommandInfo[];
  onSelect: (command: SlashCommandInfo) => void;
  onDismiss: () => void;
  visible: boolean;
}

export function SlashCommandMenu({
  filter,
  commands,
  onSelect,
  onDismiss,
  visible,
}: SlashCommandMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const allCommands = [...LOCAL_COMMANDS, ...commands];

  const grouped: Record<string, SlashCommandInfo[]> = {};
  for (const cmd of allCommands) {
    const group = cmd.category === "local" ? "App" :
                  cmd.category === "builtin" ? "Agent" :
                  cmd.category === "skill" ? "Skills" : "Other";
    (grouped[group] ??= []).push(cmd);
  }

  const categoryLabels = ["App", "Agent", "Skills", "Other"];

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 mb-1 z-50"
    >
      <Command
        filter={(value, search) => {
          if (value.includes(search.toLowerCase())) return 1;
          return 0;
        }}
        className="rounded-lg border border-border bg-popover shadow-lg max-h-[280px]"
      >
        <CommandList>
          <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
            No commands found
          </CommandEmpty>
          {categoryLabels.map((label) => {
            const items = grouped[label];
            if (!items?.length) return null;
            return (
              <CommandGroup key={label} heading={label}>
                {items.map((cmd) => (
                  <CommandItem
                    key={cmd.name}
                    value={cmd.name}
                    onSelect={() => onSelect(cmd)}
                    className="flex items-center gap-2 px-2 py-1.5"
                  >
                    <span className="font-mono text-xs text-foreground">
                      /{cmd.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {cmd.description}
                    </span>
                    {cmd.source && (
                      <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">
                        {cmd.source}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </div>
  );
}
