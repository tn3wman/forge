# FORGE: Comprehensive Design Specification

**The Agentic Development Environment**
Version 1.0 | March 2026 | Confidential

---

## 1. Executive Summary

**Forge** is a desktop-first, model-agnostic development environment that combines editor, terminal, repo graph, task orchestration, live preview, diff review, browser automation, and multi-agent coordination into a single project-centered control plane.

Current agentic coding tools force developers into broken tradeoffs: great agents with poor file visibility, strong editors with weak orchestration, good previews with poor terminal control, and single-model lock-in disguised as flexibility. Developers bounce between VS Code, terminals, browser tabs, Claude Code, Codex, chat windows, preview panes, and desktop managers. The core problem is not that any single tool is awful. The problem is that no tool is the **home base** for agentic work.

Forge is the home base.

### 1.1 The Market Opportunity

The agentic IDE market has reached an inflection point. Cursor leads with $500M+ ARR, Windsurf competes on price, and JetBrains Air just launched as a public preview of a true agent-centric environment. Yet developer trust in AI-generated code has actually declined from 43% (2024) to 33% (2026), with 45% reporting that "almost-right" solutions are their top frustration.

The market is bifurcating between **agentic IDEs** (enhanced editors like Cursor and Windsurf) and **agentic development environments** (purpose-built platforms like JetBrains Air). IDEs are faster to adopt but architecturally constrained. ADEs handle complex tasks better but require reimagining the development workflow. Forge occupies a unique position: a project operating system that is neither a bolted-on AI sidebar nor an opaque autonomous agent, but a coherent control plane for human-agent collaboration.

### 1.2 Key Market Data

- **45%** of developers say "AI solutions that are almost right, but not quite" is the #1 frustration
- **66%** spend more time fixing almost-right AI code than expected
- **40%** of AI-generated code contains vulnerabilities (Python 29.5%, JavaScript 24.2%)
- **19%** productivity loss in experienced developers due to constant re-prompting and context switching
- **38%** of teams using 6+ AI tools feel "context-blind" despite tool improvements
- Developer trust in AI accuracy has **declined** from 43% (2024) to 33% (2026)

---

## 2. Problem Analysis

Developers are working inside too many control planes at once: VS Code for files and editing, Claude Code CLI for agent execution, terminals for commands and servers, browsers for preview and testing, and macOS desktops for project switching. Each tool is strong individually, but none is the home base.

### 2.1 Core Pain Points

| Pain Point | Current Reality | Forge Solution |
|---|---|---|
| Scattered project state | Files in editor, agent output in CLI, commands in terminal, preview in browser, diffs in git, context in your brain | Bay (project cockpit) unifies all surfaces |
| Agents run off to the side | Agent execution is disconnected from workspace; no structured visibility into what agents do | Activity Lanes with goals, diffs, commands, screenshots, approvals, and checkpoints |
| Poor multi-project separation | Switching projects causes wrong terminals, wrong tabs, confusion, mental overhead | Bay = one project, Harbor = all projects dashboard with instant switching |
| No agent action visibility | You don't know what commands ran, what changed, or what failed | Command Ledger + Timeline tracks every action with full metadata |
| Disconnected review | Manually inspect diffs without task context; 42-file changes with no grouping | Lane-based review groups diffs by task intent with scoped approvals |
| Model lock-in | Most tools lock you to a single provider or require expensive subscriptions | Real BYOM: API keys, local models, subscription connectors, per-role routing |
| Constant context switching | You are the glue between disconnected tools, constantly reconstructing state | Persistent state: Bay remembers layout, Lane remembers work, Harbor shows everything |

### 2.2 Why Worktrees Are Not Enough

Several emerging tools rely on Git worktrees as their primary approach to parallel agent work. While worktrees provide file isolation, they fail to address the deeper challenges:

- **Database and infrastructure collisions:** Worktrees share the same local database, Docker daemon, and cache directories. Two agents modifying a database simultaneously create race conditions.
- **Disk space explosion:** Reports show ~2GB codebases consuming nearly 10GB in 20-minute sessions with automatic worktree creation due to duplicated build artifacts.
- **Merge coordination:** Worktrees become outdated without regular syncing, leading to complex logical conflicts that are harder to resolve than simple file conflicts.
- **IDE support inconsistencies:** JetBrains products have no native worktree creation UI (command line only). Claude Code's `/ide` command fails to recognize worktrees.
- **No execution context:** Worktrees solve file isolation but provide zero visibility into what the agent actually did, no approval system, and no structured review.

Forge addresses parallel work through Activity Lanes, which provide not just file isolation but full execution context, structured review, and checkpoint-based rollback.

### 2.3 The Trust Gap

Developer trust in AI-generated code is declining, not improving. 66% of developers spend more time fixing almost-right code than expected. 40% of AI-generated code contains vulnerabilities. The solution is not better models alone — it is better observability, structured review, and safe execution defaults. Forge is designed around this principle.

---

## 3. Product Principles

| # | Principle | Rationale |
|---|---|---|
| 1 | Project is the primary unit, not file, tab, or chat | Everything radiates from the project context, not individual files |
| 2 | Agents are workers, not the UI | Agents execute tasks within structured lanes, not as chatbots |
| 3 | Human review is first-class and fast | Every change is reviewable, groupable, and approvable via keyboard |
| 4 | Execution must be observable | Every command, edit, and decision is logged and replayable |
| 5 | Every action must be reversible | Checkpoints enable rollback at lane, file, and project levels |
| 6 | Bring your own model must be real | No single-provider lock-in; route different roles to different models |
| 7 | Multi-project work must feel natural | Manage 3+ unrelated projects without desktop chaos |
| 8 | Local-first where possible, cloud when useful | Data stays local; cloud services are opt-in additions |
| 9 | Terminal, browser, editor, and preview belong in one system | Stop bouncing between five applications for one workflow |
| 10 | The UI should reduce context switching, not add to it | Every panel earns its place by eliminating an external tool |

---

## 4. Core Architecture

### 4.1 Conceptual Model

Forge is organized around three nested concepts:

- **Harbor:** The top-level multi-project dashboard. Shows all open projects with their status, active agents, failing tests, pending diffs, and last activity. Keyboard-navigable with hotkeys for instant switching.
- **Bay:** A self-contained project workspace. Each Bay contains a file tree, code editor, integrated terminal grid, running services panel, live app preview, browser automation view, git/diff timeline, agent roster, plan board, and environment status.
- **Lane:** A persistent, reviewable stream of work within a Bay. Each Lane has a goal, assigned agent/model, working set of files, terminal actions, browser actions, proposed diffs, checkpoints, and a final result. Multiple Lanes can run in parallel without losing clarity.

### 4.2 Main UI Layout

#### 4.2.1 Global Dock

A thin left dock provides global navigation: Bays, Search, Agents, Models, Tasks, Git Timeline, Notifications, and Settings.

#### 4.2.2 Bay Header

Top header for the active project showing: project name, git branch, environment badge, health badge, active services count, active agents count, preview status, and quick command palette.

#### 4.2.3 Three-Column Bay Layout

| Panel | Contents | Purpose |
|---|---|---|
| Left Rail | File tree, symbol/search pane, open buffers, bookmarks, TODOs from code | Project structure and navigation |
| Center | Editor, diff review, plan board, architecture map, agent conversation (tabbed) | Primary work surface |
| Right Rail | Terminal grid, task runner, logs, browser preview, browser automation, test failures, agent activity feed | Runtime and intelligence |
| Bottom Tray | Database inspector, network inspector, traces, job queue, snapshots (expandable) | Deep inspection on demand |

---

## 5. Activity Lanes

**Activity Lanes are the core innovation of Forge.** Traditional editors mix everything together. Forge separates work into persistent, reviewable streams.

### 5.1 Lane Anatomy

Each Lane contains:

- **Goal:** A clear statement of what this stream of work accomplishes
- **Assigned agent and model:** Which agent role and which model powers it
- **Working set:** Files the agent may read and the human cares about most
- **Terminal actions:** Every command executed, with full metadata
- **Browser actions:** Screenshots, DOM inspections, regression flows
- **Generated plan:** Executable steps with acceptance criteria
- **Proposed diffs:** Grouped by semantic intent, not just file
- **Checkpoints:** Labeled snapshots that can be diffed, restored, or cherry-picked
- **Execution trace:** Complete record of every decision and action

### 5.2 Parallel Lane Examples

| Lane | Goal | Agent Role | Scope |
|---|---|---|---|
| Lane 1 | Fix auth callback redirect loop | Builder | auth/ files + browser preview |
| Lane 2 | Refactor recipe import parser | Refactorer | parsers/ module only |
| Lane 3 | Write tests for payment webhooks | Tester | Test files only + read payments/ |
| Lane 4 | Upgrade dependencies safely | Release Manager | package.json + lockfile + CI config |

The user can run all four Lanes simultaneously. Each Lane has its own conversation, execution trace, diffs, approvals, and rollback point. This solves the core chaos of current agentic tools.

---

## 6. Multi-Agent System

### 6.1 Agent Roles

Forge ships with role templates, each with default permission scopes:

| Role | Can Read | Can Write | Can Execute | Special Access |
|---|---|---|---|---|
| Builder | All code | Scoped modules | Build + test commands | Browser preview |
| Refactorer | All code | Selected modules | Formatters, static analysis | Requires approval for schema changes |
| Debugger | All code + logs | Targeted fixes | Debug commands, profilers | Log and trace access |
| Tester | All code | Test files only | Test commands | Coverage tools |
| Reviewer | All code + diffs | None (comments only) | Static analysis | Lane diff access |
| Researcher | All code + docs | Notes only | Search + web fetch | External documentation |
| Release Manager | All code + CI | Config + deps | Build, deploy, publish | CI/CD integration |
| Docs Writer | All code | Documentation files | Doc generation tools | README and API docs |
| Browser Operator | DOM + screenshots | None | Browser navigation | Vision-capable model required |
| Data Migrator | All code + DB schema | Migration files | DB commands | Requires approval for destructive ops |

### 6.2 Agent Permission Model

Agents operate with explicit scopes, not free-roaming access:

- **File scopes:** Which directories and file patterns the agent can read and write
- **Command scopes:** Which shell commands are pre-approved, which require approval
- **Network scopes:** Which external requests are allowed
- **Browser scopes:** Which URLs and actions are permitted
- **Write permissions:** Granular control over which files can be modified
- **Approval thresholds:** Configurable triggers for human review based on risk level

This makes agents feel useful instead of dangerous. A Tester cannot touch configs without approval. A Refactorer requires human sign-off for schema changes. A Browser Operator needs a vision-capable model and is restricted to specified URLs.

---

## 7. Bring Your Own Model (BYOM)

This is non-negotiable. Forge supports three model paths:

### 7.1 API Connectors

Bring keys from Anthropic, OpenAI, Google, xAI, OpenRouter, Together, Groq, DeepSeek-compatible endpoints, and any OpenAI-compatible API.

### 7.2 Local Model Connectors

Use Ollama, LM Studio, vLLM, llama.cpp servers, or any custom OpenAI-compatible gateway.

### 7.3 Subscription Connectors

When providers contractually allow it, direct auth connectors for Claude, ChatGPT, and GitHub-backed model entitlements.

### 7.4 Model Routing

Users define per-role routing policies:

| Agent Role | Recommended Model Tier | Rationale |
|---|---|---|
| Builder | Claude Opus / GPT-4 class | Complex multi-file reasoning |
| Fast Autocomplete | Local Qwen / Codestral | Sub-100ms latency requirement |
| Test Generation | Claude Sonnet / GPT-4o-mini | High volume, moderate complexity |
| Reviewer | Strongest reasoning model | Catches subtle bugs and security issues |
| Browser Operator | Vision-capable model | Requires screenshot understanding |
| Researcher | Large context model | Needs to process extensive documentation |

This prevents subscription lock-in and lets developers optimize for cost, speed, and quality independently per role.

---

## 8. Editor, Terminal, and Preview

### 8.1 Editor

Forge is file-native, not chat-without-files. The editor provides:

- Monaco or Zed-style high-performance core
- Split panes
- Sticky diffs
- Inline AI proposals
- Symbol-aware navigation
- Project map
- Editable code and markdown previews
- Local history per file
- Structural edits based on syntax trees (tree-sitter)

### 8.2 Terminal Architecture

Terminal is a first-class citizen with a tileable grid per Bay. Each shell can serve a specific purpose: app server, test watcher, git commands, or agent-executed commands.

The **Agent Command Ledger** records every command with:

- Exact command string
- Working directory
- Environment source
- Duration
- Exit code
- stdout/stderr
- Whether it mutated state

**Safe execution modes:**

| Mode | Behavior |
|---|---|
| Suggest only | Agent proposes commands, never runs them |
| Ask before each | Human approves every command individually |
| Auto-approve safe | Pre-approved commands run automatically; risky ones require approval |
| Sandbox risky | Risky commands run in isolated sandbox |
| Full trusted | All commands execute without approval |

### 8.3 Live Preview and Browser Automation

The preview panel provides:

- Local web app preview with configurable port
- Mobile viewport presets
- Hot reload awareness
- Crash and console error indicators

The **Browser Operator** agent can:

- Open routes
- Click buttons and fill forms
- Capture screenshots
- Inspect DOM
- Compare before/after states
- Run regression flows

**Human handoff** is instant: take over the same browser session at any moment. This removes the jump between external browser, screenshot tools, and editor chat.

---

## 9. Git and Timeline

### 9.1 Execution Timeline

Git UI today is too branch-centric for agentic work. Forge adds an execution timeline with layers for:

- File edits
- Command executions
- Test runs
- Preview screenshots
- Checkpoints
- Commits
- Agent handoffs

### 9.2 Checkpoints

At any moment:

- Snapshot current work
- Label it
- Diff from any prior point
- Roll back a single Lane without affecting others
- Cherry-pick a Lane into another branch

### 9.3 Smart Commits

Forge groups commits by Lane with conventional format:

```
feat(auth): repair OAuth callback handling
test(import): add parser regression coverage
refactor(recipes): extract parsing into dedicated module
```

This makes agent work legible in git history.

---

## 10. Multi-Project Control Plane

This is where current tools fail hardest. Forge treats each project as a Bay but provides a Harbor view for multiple projects.

### 10.1 Harbor Dashboard

Shows all open projects with:

- Active branch
- Failing tests
- Running services
- Pending diffs
- Assigned agents
- Last activity
- Preview status

Jump between projects instantly with keyboard shortcuts (Cmd+1 through Cmd+9).

### 10.2 Cross-Project Operations

- Find symbol across all open projects
- Ask an agent to compare implementations across repos
- Propagate shared changes to selected repos
- Run release checklists for several projects simultaneously

---

## 11. Plans, Tasks, and Approvals

### 11.1 Executable Plans

Plans are not detached markdown blobs. A plan contains:

- Goals
- Constraints
- File scopes
- Acceptance criteria
- Subtasks
- Assigned lane/agent
- Verification steps
- Dependency graph

Any plan step can be promoted into a live Lane.

### 11.2 Task Orchestration

Forge includes a native task graph system. Tasks can be:

- Shell commands
- Scripts
- Agent prompts
- Browser flows
- Test suites
- Deploy steps
- Git operations

Tasks chain with dependencies and conditionals. Example flow:

```
start dev server → wait for port 3000 → open preview → run smoke test lane →
  if pass → ask reviewer agent for signoff →
  if pass → commit and push
```

### 11.3 Approval System

| Action | Manual Mode | Balanced Mode | Trusted Mode |
|---|---|---|---|
| Edit file | Approve each | Auto-approve safe files | Auto-approve all |
| Run command | Approve each | Auto-approve safe commands | Auto-approve all |
| Install dependency | Approve each | Approve each | Auto-approve |
| Change DB schema | Approve each | Approve each | Approve each |
| Create commit | Approve each | Auto-approve | Auto-approve |
| Push branch | Approve each | Approve each | Auto-approve |
| Deploy | Approve each | Approve each | Approve each |

Approvals can be done from keyboard without breaking flow. Enterprise teams get a **locked-down mode** with full audit logging.

---

## 12. Memory and Context

### 12.1 Three-Layer Memory

- **Project memory:** Coding conventions, architecture notes, important files, common commands, preview routes, test expectations. Persists across sessions.
- **Lane memory:** Objective, constraints, files touched, failed attempts, decisions made. Scoped to the work stream.
- **User memory:** Preferred models, preferred agent roles, approval style, editor layout. Personal and portable.

### 12.2 Solving Context Rot

Context rot occurs when a context window fills and compaction begins, forcing the model to lose important project context. Forge addresses this through intelligent context management:

- Automatic project indexing that maps functions, imports, and relationships
- Smart context selection that provides the right amount without overwhelming
- Persistent memory backed by SQLite that survives between sessions
- Working sets that pin the most relevant files for each Lane
- Architecture graph that gives agents structural understanding without consuming context tokens

---

## 13. Search and Code Intelligence

### 13.1 Search Modes

- **Lexical search** across all project files
- **Regular expression** search with full regex syntax
- **Symbol search** powered by tree-sitter and LSP
- **Semantic code search** using embeddings (optional)
- **Change search** over the execution timeline
- **Error search** over logs and test output
- **Cross-project search** across all open Bays

### 13.2 Architecture Graph

Auto-generated graph showing:

- Modules and their relationships
- Services and endpoints
- Routes and handlers
- Data models and schemas
- Dependencies (internal and external)
- Test coverage mapping

Both agents and humans use the same graph for navigation and understanding.

---

## 14. Extensibility

Forge cannot become another extension graveyard. Plugins are sandboxed capabilities, not UI chaos.

### 14.1 Plugin Categories

- Language packs (syntax, LSP, formatters)
- Model providers (new API endpoints or local runtimes)
- Linters and formatters
- Deploy targets (Vercel, AWS, GCP, etc.)
- Database tools (migration, inspection, query)
- Browser connectors
- External MCP-style tool integrations

### 14.2 Tool Contracts

Each tool declares:

- Inputs and outputs
- Required permissions
- Mutating vs. non-mutating behavior
- Observability hooks

This enables the permission system to reason about tool safety and enables the Command Ledger to track tool usage.

---

## 15. Collaboration

### 15.1 Team Features

- Shared plans and lane templates
- Review requests between team members
- Replayable agent sessions for learning and debugging
- Handoff bundles for context transfer
- Repository conventions sync

### 15.2 Handoff Bundles

A handoff includes:

- Goal
- Current diffs
- Execution trace
- Failing tests
- Screenshots
- Next recommended steps

This is dramatically better than "here's a branch, good luck."

---

## 16. Security and Enterprise

- Local secret vault integration
- Per-tool permission enforcement
- Network egress controls
- Audit logs for all agent actions
- Organization policy packs
- Redaction rules for prompts and logs
- Support for local-only model mode (air-gapped environments)

**Deployment options:**

- Desktop app (primary)
- Optional team sync service
- Self-hosted enterprise control plane

---

## 17. Suggested Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Desktop Shell | Tauri (preferred) or Electron | Lightweight native feel; Electron for dev speed if needed |
| Editor | Monaco initially; tree-sitter + LSP for structural editing | Proven editor core with path to advanced features |
| Terminal | xterm.js frontend + robust PTY process manager | Industry standard with good performance |
| Browser Automation | Playwright + embedded Chromium/WebView | Full automation API with human takeover capability |
| Git and Timeline | libgit2 or git CLI + SQLite for event log | Fast git ops with structured event storage |
| Code Intelligence | tree-sitter + ripgrep + symbol index + optional embeddings | Fast parsing and search with optional semantic layer |
| Model Gateway | OpenAI-compatible base + native Anthropic/OpenAI/Gemini adapters | Maximum provider flexibility |
| State Model | Event-sourced activity log per Bay and per Lane | Complete auditability and replay capability |
| Packaging | macOS first, then Windows and Linux | Largest developer audience first |

---

## 18. Competitive Positioning

| Capability | Cursor | Windsurf | JetBrains Air | Claude Code | Forge |
|---|---|---|---|---|---|
| Multi-project management | No | No | No | No | **Harbor + Bays** |
| Parallel agent lanes | Background agents | Parallel Cascade | Multi-agent | Worktrees | **Activity Lanes** |
| Execution visibility | Limited | Limited | Partial | Terminal output | **Full Command Ledger** |
| Lane-based review | No | No | No | No | **Yes** |
| Checkpoint rollback | No | No | No | No | **Per-lane checkpoints** |
| True BYOM | Limited | Limited | ACP standard | Anthropic only | **Full BYOM + routing** |
| Browser automation | No | No | Planned | MCP-based | **Built-in Playwright** |
| Integrated preview | No | No | Planned | No | **Native preview pane** |
| Agent permissions | Basic | Basic | Configurable | Basic | **Granular scoped permissions** |
| Offline / local-first | No | No | No | Yes | **Yes** |

---

## 19. Keyboard-First Design

Anything important must be reachable in under two keystrokes after the command palette.

| Action | Shortcut |
|---|---|
| Open Harbor | `Cmd+Shift+H` |
| Jump to Bay 1-9 | `Cmd+1` through `Cmd+9` |
| Switch Lane | `Cmd+Shift+L` |
| Open command palette | `Cmd+K` |
| Focus terminal | `` Cmd+` `` |
| Focus editor | `Cmd+E` |
| Focus preview | `Cmd+P` |
| Approve next action | `Cmd+Enter` |
| Reject action | `Cmd+Backspace` |
| Checkpoint now | `Cmd+Shift+S` |
| Start new Lane | `Cmd+Shift+N` |

---

## 20. What Makes Forge Different

Most tools are one of these: editor with AI, terminal agent, browser preview helper, or chat app with code access. Forge is a **project operating system for agentic development**.

### 20.1 Core Differentiators

- **Bays and Harbor** for true multi-project work without desktop chaos
- **Activity Lanes** for parallel agent tasks with full context isolation
- **Command Ledger** for total execution visibility and auditability
- **Strict scoped permissions** that make agents useful instead of dangerous
- **Checkpoint timeline** combining code, commands, tests, and screenshots
- **Real BYOM** with per-role model routing instead of fake lock-in friendliness
- **Integrated browser automation** that eliminates the preview-screenshot-editor loop
- **Lane-based review** that groups changes by intent, not just by file

### 20.2 One-Sentence Summary

**Forge is the first truly coherent control plane for agentic software development.** It solves not "better autocomplete," but workflow collapse from too many surfaces.

---

## Example User Flow

### Scenario: Fix bug while another agent writes tests in a different project

1. Open Harbor
2. See Project A has failing login flow and Project B agent finished a docs lane
3. Jump to Project A Bay
4. Start lane: "repair auth callback redirect loop"
5. Assign Builder agent with scope limited to auth files and browser preview access
6. Agent proposes plan and begins changes
7. Human watches browser replay and command ledger live
8. Forge checkpoints before dependency update
9. Agent runs app, reproduces bug, edits 4 files, reruns tests
10. Human reviews semantic diff grouped by lane
11. Hit approve
12. Reviewer agent checks for unintended auth regressions
13. Commit grouped to lane
14. Jump to Project B and approve docs lane from Harbor

No switching between five apps. No lost context.

---

## Landing Page Copy

**Headline:** Your projects finally have a cockpit.

**Subheadline:** Forge is the agentic development environment that unifies code, terminals, previews, browser automation, diffs, and multi-agent execution in one project-centered workspace.

**Three bullets:**
- Run multiple agents across multiple projects without losing control
- Review every edit, command, test, and screenshot in one timeline
- Bring your own models, your own keys, and your own workflow

**CTA:** Open a Bay. Launch a lane. Ship faster.

---

## Positioning

- **For solo developers:** Stop bouncing between editor, terminal, browser, and AI chats.
- **For power users:** Run multiple projects and agents at once without desktop chaos.
- **For teams:** Review agent work with real traceability and safer approvals.

---

## Brutally Honest Summary

If this product existed and was executed well, people would care because it solves a real pain: not "better autocomplete," but **workflow collapse from too many surfaces**.

That is the opportunity.

Forge should not try to be just another VS Code fork with one more sidebar. It should be the first truly coherent control plane for agentic software development.
