# Another vibe coder, another AI-slop "agentic development environment" — except this one actually solves my three-window problem

**Subreddit:** r/programming or r/webdev or r/rust

---

OK hear me out before you close the tab.

I'm not a programmer by trade, and I can't guarantee anything I say in this post is technically correct. But I've been using Claude Code / Codex / Aider for most of my daily work. It's great. The agents write code, they run tests, they make PRs. The future is here, etc.

But here's what my actual workflow looked like:

**Window 1:** Terminal running the coding agent. Claude is writing code, asking me to approve tool calls, doing its thing.

**Window 2:** Browser. Because when the agent opens a PR, I need to go review it. Read the diff. Check the CI. Maybe leave comments. Merge it. If there are issues, I need to context-switch back to Window 1, tell the agent what's wrong, wait for the fix, then go back to Window 2 to re-review.

**Window 3:** VS Code. Because sometimes I just want to *look at a file*. Or check what branch I'm on. Or see the git log. Or manage worktrees because I have 4 agents running on 4 different branches.

Alt-tabbing between three windows dozens of times a day. Copying branch names. Remembering which worktree maps to which PR. Losing my place in a diff because I switched to approve a permission prompt.

I got tired of it, so I built **Forge** — a desktop app that puts all three of those windows into one.

## What it actually does

Forge is a Tauri 2 desktop app (React 19 + Rust backend) that combines:

**Git client** — staging, commits, branches, stash, worktree management, a canvas-based commit graph that handles 10K+ nodes at 60fps. You know, the basics, but native and fast.

![Commit graph with branch labels and lane topology](screenshots/commit-graph.png)

**GitHub integration** — PRs, issues, reviews, merge (merge/squash/rebase), status checks, notifications. All via GraphQL so it's actually snappy. You can review a PR, approve it, and merge it without ever opening a browser.

![Dashboard showing PRs and issues with diff stats](screenshots/dashboard.png)

**AI agent sessions** — First-class Claude Code / Codex / Aider integration. Not a chatbot sidebar — full PTY-backed agent sessions with permission approval workflows. The agent runs in one panel, the PR it created shows up in another panel, and the diff it produced is right there in a third. One app.

![Four agent sessions running simultaneously in grid layout](screenshots/agent-grid.png)

**Real terminals** — Native PTY via `portable-pty`, rendered with xterm.js. These aren't fake terminals. You get your shell, your aliases, your tools.

## The workflow that I think works now

1. Agent creates a PR from a worktree → I see it immediately in the PR list
2. Click the PR → full diff with CodeMirror syntax highlighting, conversation thread, status checks
3. See an issue → type feedback in the agent chat panel, agent fixes it
4. Diff updates → approve → merge. All without leaving the app.
5. Switch to another workspace (Cmd+1-9) → completely different project, different repos, different agent sessions

No more alt-tab roulette. No more copying branch names between windows. No more "wait which worktree was that PR on again?"

![Changes page with staging area and inline diff viewer](screenshots/changes-diff.png)

## Some technical choices people might care about

- **Tauri 2 + Rust backend** — GitHub tokens live in OS keychain (never in JS). All git operations happen in Rust via `git2`. App bundles to ~14MB.
- **GraphQL-first GitHub API** — One query gets PR detail + reviews + timeline + status checks. REST for notifications only.
- **Canvas commit graph** — Not SVG. Canvas. Because I wanted it to not choke on real repos with actual history.
- **CodeMirror 6 for diffs** — 150KB instead of Monaco's 10MB. Syntax highlighting, merge view, the works.
- **SQLite (WAL mode)** — Local cache for GitHub data so the app feels instant even when GitHub's API is being GitHub's API.
- **Worktree management with symlink optimization** — When you create a worktree, Forge symlinks `node_modules`, `.next`, `dist`, `target`, and `.turbo` from the main tree. No more waiting for `npm install` in every worktree.
- **Agent permission workflow** — When Claude wants to run a command, you get a prompt. Press `y` or `n`. No mouse required. Three permission modes: normal, plan, yolo (dangerously-skip-permissions).
- **Plugin-aware** — Auto-discovers Claude Code plugins from `~/.claude/plugins/` and integrates their slash commands.

![Branch management showing local/remote branches with merged status](screenshots/branches.png)

## What it's NOT

- It's not a full IDE. No text editing (yet). You're still writing code in your editor of choice, or more realistically, watching an AI write it.
- It's not trying to replace GitHub.com for everything. It handles the 90% case: reviewing PRs, managing issues, merging, and the review→fix→re-review loop that agents make 10x more frequent.
- It's not production-ready yet. It works on my machine. It has bugs. The settings page is half-built. But the core loop — agent → PR → review → merge — that works.
- I'm not a programmer by trade, so if I did something architecturally horrifying... well, that's what the issues tab is for.

## Stack

Tauri 2 · React 19 · TypeScript · Rust · SQLite · git2 · GraphQL · TanStack Query · Zustand · CodeMirror 6 · xterm.js · Tailwind v4 · shadcn/ui

**Repo:** [github.com/tn3wman/forge](https://github.com/tn3wman/forge) *(or wherever you host it)*

Happy to answer questions. Roast my architecture. Tell me I should have just used tmux. Whatever.
