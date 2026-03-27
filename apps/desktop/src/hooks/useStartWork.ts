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
  const token = useAuthStore((s) => s.token);
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
      if (!token) {
        setError("Not authenticated");
        setStep("error");
        return;
      }

      const branchName = `forge/issue-${config.issueNumber}`;

      try {
        // Step 1: Fetch remote to ensure we have latest refs
        setStep("fetching");
        await gitIpc.fetch(config.repoLocalPath, token);

        // Step 2: Create branch from base
        setStep("creating-branch");
        try {
          await gitIpc.createBranch(config.repoLocalPath, branchName, `origin/${config.baseBranch}`);
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
          await gitIpc.push(worktree.path, token, "origin", branchName);
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
          token,
          config.owner,
          config.repo,
          config.issueTitle,
          prBody,
          branchName,
          config.baseBranch,
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
    [token],
  );

  return { step, error, result, execute, reset };
}
