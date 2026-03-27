import { cn } from "@/lib/utils";
import type { AgentChatMode } from "@forge/shared";

interface ModeSelectorProps {
  value: AgentChatMode;
  onChange: (mode: AgentChatMode) => void;
}

const modes: { value: AgentChatMode; label: string }[] = [
  { value: "supervised", label: "Supervised" },
  { value: "assisted", label: "Assisted" },
  { value: "fullAccess", label: "Full Access" },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === mode.value
              ? "bg-background text-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
