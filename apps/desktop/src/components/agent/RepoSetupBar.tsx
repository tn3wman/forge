import { useState, useCallback } from "react";
import { FolderOpen, Download, Loader2, Search, Lock } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { repoIpc, type SearchRepoResult } from "@/ipc/repository";
import { gitIpc } from "@/ipc/git";
import { useSetLocalPath, useCloneRepo } from "@/queries/useGitMutations";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { Repository } from "@forge/shared";

interface RepoSetupBarProps {
  workspaceId: string;
  repos: Repository[];
  disabled?: boolean;
}

function parseGitHubRemote(url: string): { owner: string; name: string } | null {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  return match ? { owner: match[1], name: match[2] } : null;
}

export function RepoSetupBar({ workspaceId, repos, disabled }: RepoSetupBarProps) {
  const token = useAuthStore((s) => s.token);
  const setLocalPath = useSetLocalPath();
  const cloneRepo = useCloneRepo();
  const queryClient = useQueryClient();

  const [cloneOpen, setCloneOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchRepoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlinkedRepo = repos.find((r) => !r.localPath);

  const handleSelectLocal = useCallback(async () => {
    setError(null);
    const selected = await open({
      directory: true,
      title: "Select a local Git repository",
    });
    if (!selected) return;

    try {
      const remoteUrl = await gitIpc.getRemoteUrl(selected);

      if (remoteUrl) {
        const parsed = parseGitHubRemote(remoteUrl);
        if (parsed) {
          const matchingRepo = repos.find(
            (r) =>
              r.owner.toLowerCase() === parsed.owner.toLowerCase() &&
              r.name.toLowerCase() === parsed.name.toLowerCase(),
          );
          if (matchingRepo) {
            setLocalPath.mutate({ repoId: matchingRepo.id, localPath: selected });
            return;
          }
        }
      }

      if (unlinkedRepo) {
        setLocalPath.mutate({ repoId: unlinkedRepo.id, localPath: selected });
        return;
      }

      const parsed = remoteUrl ? parseGitHubRemote(remoteUrl) : null;
      const dirName = selected.split("/").pop() ?? "repo";
      const owner = parsed?.owner ?? "local";
      const name = parsed?.name ?? dirName;

      const newRepo = await repoIpc.add({
        workspaceId,
        owner,
        name,
        fullName: `${owner}/${name}`,
        isPrivate: false,
        defaultBranch: "main",
      });

      setLocalPath.mutate({ repoId: newRepo.id, localPath: selected });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [repos, unlinkedRepo, workspaceId, setLocalPath]);

  const handleSearch = useCallback(async () => {
    if (!token || !searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const results = searchQuery.trim().length <= 2
        ? await repoIpc.listUserRepos(token)
        : await repoIpc.searchGithub(token, searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }, [token, searchQuery]);

  const handleCloneRepo = useCallback(
    async (result: SearchRepoResult) => {
      if (!token) return;
      setError(null);

      const dest = await open({
        directory: true,
        title: `Choose where to clone ${result.fullName}`,
      });
      if (!dest) return;

      const clonePath = `${dest}/${result.name}`;
      const url = `https://github.com/${result.fullName}.git`;

      setCloning(true);
      try {
        let repoRecord = repos.find(
          (r) => r.owner === result.owner && r.name === result.name,
        );
        if (!repoRecord) {
          repoRecord = await repoIpc.add({
            workspaceId,
            owner: result.owner,
            name: result.name,
            fullName: result.fullName,
            githubId: result.githubId,
            isPrivate: result.isPrivate,
            defaultBranch: result.defaultBranch,
          });
        }

        await cloneRepo.mutateAsync({
          url,
          localPath: clonePath,
          repoId: repoRecord.id,
        });

        setCloneOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        queryClient.invalidateQueries({ queryKey: ["repositories"] });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setCloning(false);
      }
    },
    [token, repos, workspaceId, cloneRepo, queryClient],
  );

  return (
    <div className="flex flex-col gap-1 px-5 pb-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/70">
          No repository linked
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectLocal}
            disabled={disabled || setLocalPath.isPending}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {setLocalPath.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FolderOpen className="h-3 w-3" />
            )}
            Select local
          </button>

          {token && (
            <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
              <DialogTrigger asChild>
                <button
                  disabled={disabled || cloning}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {cloning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Clone from GitHub
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Clone from GitHub</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="Search repositories..."
                    className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none"
                    autoFocus
                  />
                  {searching && (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="max-h-52 overflow-y-auto rounded-md border">
                  {searchResults.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      {searchQuery
                        ? "Press Enter to search"
                        : "Type to search your repos"}
                    </div>
                  ) : (
                    searchResults.map((result) => (
                      <button
                        key={result.githubId}
                        onClick={() => handleCloneRepo(result)}
                        disabled={cloning}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors border-b last:border-b-0",
                          cloning && "opacity-50",
                        )}
                      >
                        <span className="flex-1 truncate">
                          {result.fullName}
                        </span>
                        {result.isPrivate && (
                          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        {result.description && (
                          <span className="hidden" />
                        )}
                      </button>
                    ))
                  )}
                </div>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {error && !cloneOpen && (
        <p className="text-[11px] text-destructive truncate">{error}</p>
      )}
    </div>
  );
}
