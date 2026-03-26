import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterBarProps {
  filters: FilterOption[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export function FilterBar({
  filters,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
      <div className="flex items-center gap-1">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              activeFilter === filter.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {filter.label}
            {filter.count != null && (
              <span
                className={cn(
                  "tabular-nums text-[10px]",
                  activeFilter === filter.value
                    ? "text-accent-foreground/70"
                    : "text-muted-foreground/60",
                )}
              >
                {filter.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {onSearchChange && (
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-7 w-48 pl-7 text-xs"
          />
        </div>
      )}
    </div>
  );
}
