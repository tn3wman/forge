import { useState } from "react";
import { Search as SearchIcon, GitPullRequest, CircleDot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearch, type SearchResultItem } from "@/queries/useSearch";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { TimeAgo } from "@/components/common/TimeAgo";
import { cn } from "@/lib/utils";

export function Search() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading, isFetching } = useSearch(query);
  const { navigateToPr, navigateToIssue } = useWorkspaceStore();

  function handleClick(item: SearchResultItem) {
    if (item.isPullRequest) {
      navigateToPr(item.repoFullName, item.number);
    } else {
      navigateToIssue(item.repoFullName, item.number);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search input */}
      <div className="border-b px-4 py-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search issues and pull requests..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {isFetching && !isLoading && (
          <p className="mt-1 text-xs text-muted-foreground">Updating...</p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {query.length < 2 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Type at least 2 characters
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Searching...</p>
          </div>
        ) : results && results.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>
        ) : (
          <ul className="divide-y">
            {results?.map((item) => {
              const isOpen = item.state === "open";
              const Icon = item.isPullRequest ? GitPullRequest : CircleDot;

              return (
                <li key={`${item.repoFullName}-${item.number}`}>
                  <button
                    onClick={() => handleClick(item)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isOpen ? "text-green-600" : "text-purple-600",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          #{item.number}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.repoFullName}</span>
                        <span>&middot;</span>
                        <span>{item.authorLogin}</span>
                        <span>&middot;</span>
                        <span>
                          <TimeAgo date={item.updatedAt} />
                        </span>
                      </div>
                      {item.labels.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.labels.map((label) => (
                            <span
                              key={label.name}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `#${label.color}20`,
                                color: `#${label.color}`,
                                border: `1px solid #${label.color}40`,
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
