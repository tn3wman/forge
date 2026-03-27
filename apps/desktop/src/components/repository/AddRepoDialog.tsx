import { useState, useEffect } from "react";
import { Search, Lock, Star, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { repoIpc, type SearchRepoResult } from "@/ipc/repository";
import { useAddRepo, useRepositories } from "@/queries/useRepositories";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";

interface AddRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRepoDialog({ open, onOpenChange }: AddRepoDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRepoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const addRepo = useAddRepo();
  const { activeWorkspaceId } = useWorkspaceStore();
  const token = useAuthStore((s) => s.token);
  const { data: existingRepos } = useRepositories(activeWorkspaceId);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  // Load user repos on open
  useEffect(() => {
    if (open && token) {
      setIsSearching(true);
      repoIpc
        .listUserRepos(token)
        .then(setResults)
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }
    if (!open) {
      setQuery("");
      setResults([]);
      setAddedIds(new Set());
    }
  }, [open, token]);

  // Search on query change (debounced)
  useEffect(() => {
    if (!query.trim() || !token) return;

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await repoIpc.searchGithub(token, query);
        setResults(res);
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, token]);

  const existingGithubIds = new Set(existingRepos?.map((r) => r.githubId) ?? []);

  async function handleAdd(repo: SearchRepoResult) {
    if (!activeWorkspaceId) return;
    setAddingId(repo.githubId);
    try {
      await addRepo.mutateAsync({
        workspaceId: activeWorkspaceId,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        githubId: repo.githubId,
        isPrivate: repo.isPrivate,
        defaultBranch: repo.defaultBranch,
      });
      setAddedIds((prev) => new Set(prev).add(repo.githubId));
    } catch (e) {
      console.error("Failed to add repo:", e);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Search your GitHub repositories to add to this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {query ? "No repositories found" : "Loading your repositories..."}
            </div>
          ) : (
            <div className="space-y-0.5">
              {results.map((repo) => (
                <div
                  key={repo.githubId}
                  className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {repo.fullName}
                      </span>
                      {repo.isPrivate && (
                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {repo.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  {repo.stars > 0 && (
                    <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Star className="h-3 w-3" />
                      {repo.stars}
                    </div>
                  )}
                  {existingGithubIds.has(repo.githubId) || addedIds.has(repo.githubId) ? (
                    <span className="flex h-7 items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5" />
                      Added
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdd(repo)}
                      disabled={addingId === repo.githubId}
                      className="h-7 text-xs"
                    >
                      {addingId === repo.githubId ? "Adding..." : "Add"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
