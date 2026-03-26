import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import type { Shortcut } from "@/hooks/useKeyboardShortcuts";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: Shortcut[];
}

export function CommandPalette({ open, onOpenChange, shortcuts }: CommandPaletteProps) {
  if (!open) return null;

  // Group shortcuts by category, skip disabled ones
  const groups = new Map<string, Shortcut[]>();
  for (const s of shortcuts) {
    if (s.enabled === false) continue;
    const cat = s.category ?? "General";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(s);
  }

  function handleSelect(shortcut: Shortcut) {
    shortcut.action();
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <Command
        className="relative w-full max-w-lg rounded-lg border bg-popover shadow-lg"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onOpenChange(false);
          }
        }}
      >
        <CommandInput placeholder="Type a command or search..." autoFocus />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {[...groups.entries()].map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((s) => (
                <CommandItem key={s.label} onSelect={() => handleSelect(s)}>
                  {s.label}
                  <CommandShortcut>{s.keys}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}
