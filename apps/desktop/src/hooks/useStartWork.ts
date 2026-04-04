import { useState, useCallback } from "react";
import { gitIpc } from "@/ipc/git";
import { githubIpc } from "@/ipc/github";
import { useAuthStore } from "@/stores/authStore";

export type StartWorkStep =
  | "idle"
  | "fetching"
  | "creating-branch"
  | "creating-worktree"
  | "pushing"
  | "creating-pr"
  | "done"
  | "error";

export interface StartWorkResult {
  branchName: string;
  worktreePath: string;
  prNumber: number;
  prUrl: string;
}

export interface StartWorkConfig {
  repoLocalPath: string;
  owner: string;
  repo: string;
  baseBranch: string;
  issueNumber: number;
  issueTitle: string;
}

export function useStartWork() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [step, setStep] = useState<StartWorkStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StartWorkResult | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setResult(null);
  }, []);

  const execute = useCallback(
    async (config: StartWorkConfig) => {
      if (!isAuthenticated) {
        setError("Not authenticated");
        setStep("error");
        return;
      }

      const branchName = `forge/issue-${config.issueNumber}`;

      try {
        // Step 1: Fetch remote to ensure we have latest refs
        setStep("fetching");
        await gitIpc.fetch(config.repoLocalPath);

        // Verify the remote ref exists after fetch; auto-resolve if needed
        const freshBranches = await gitIpc.listBranches(config.repoLocalPath);
        const remoteBranches = freshBranches.filter((b) => b.isRemote);
        let resolvedBase = config.baseBranch;

        if (!remoteBranches.some((b) => b.name === `origin/${resolvedBase}`)) {
          const fallback = ["main", "master"].find((f) =>
            remoteBranches.some((b) => b.name === `origin/${f}`),
          );
          if (fallback) {
            resolvedBase = fallback;
          } else {
            const available = remoteBranches.map((b) => b.name).join(", ");
            throw new Error(
              `Remote branch 'origin/${config.baseBranch}' not found. Available: ${available}`,
            );
          }
        }

        // Step 2: Create branch from base
        setStep("creating-branch");
        try {
          await gitIpc.createBranch(config.repoLocalPath, branchName, `origin/${resolvedBase}`);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          // If branch already exists, that's OK — we'll reuse it
          if (!msg.includes("already exists")) {
            throw e;
          }
        }

        // Step 3: Create worktree
        setStep("creating-worktree");
        const worktree = await gitIpc.createWorktree(config.repoLocalPath, branchName);

        // Step 3.5: Create an initial empty commit so the branch diverges from base
        // (GitHub rejects PRs with no commits between head and base)
        await gitIpc.commit(worktree.path, `chore: start work on #${config.issueNumber}`);

        // Step 4: Push branch to remote
        setStep("pushing");
        try {
          await gitIpc.push(worktree.path, "origin", branchName);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          // If branch already exists on remote, that's OK
          if (!msg.includes("already exists") && !msg.includes("up to date")) {
            throw e;
          }
        }

        // Step 5: Create draft PR
        setStep("creating-pr");
        const prBody = `Closes #${config.issueNumber}\n\n_Created via Forge Start Work._`;
        const pr = await githubIpc.createPr(
          config.owner,
          config.repo,
          config.issueTitle,
          prBody,
          branchName,
          resolvedBase,
          true,
        );

        const finalResult: StartWorkResult = {
          branchName,
          worktreePath: worktree.path,
          prNumber: pr.number,
          prUrl: pr.htmlUrl,
        };

        setResult(finalResult);
        setStep("done");
        return finalResult;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStep("error");
        return undefined;
      }
    },
    [isAuthenticated],
  );

  return { step, error, result, execute, reset };
}
