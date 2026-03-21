# FORGE: Implementation Roadmap Checklist

**Build-First, Ship-Fast Execution Plan**
Version 1.0 | March 2026 | 13 Phases | 142 Tasks | ~300 Engineering Hours to MVP

---

## Roadmap Overview

This is a **true execution checklist**. Every item represents a concrete task you can implement or verify. Tasks are sequenced by dependency, prioritized by criticality, and estimated in hours.

### Phase Summary

| Phase    | Name                   | Duration  | Tasks | Priority Items | Key Deliverable                     |
| -------- | ---------------------- | --------- | ----- | -------------- | ----------------------------------- |
| Phase 0  | Foundations            | Day 0–1   | 15    | 7 Critical     | Scaffolded desktop app + data model |
| Phase 1  | Core UI + Project      | Day 1–3   | 21    | 11 Critical    | Bay workspace + Monaco editor       |
| Phase 2  | Terminal + Commands    | Day 2–4   | 13    | 6 Critical     | Terminal grid + Command Ledger      |
| Phase 3  | Agent Engine           | Day 3–6   | 15    | 8 Critical     | BYOM agent backend + permissions    |
| Phase 4  | Activity Lanes         | Day 5–8   | 14    | 8 Critical     | Lane system + checkpoints           |
| Phase 5  | Edits + Diffs + Review | Day 6–9   | 12    | 6 Critical     | Diff viewer + approval system       |
| Phase 6  | Preview + Browser      | Day 7–10  | 13    | 5 Critical     | Live preview + Playwright           |
| Phase 7  | Git + Timeline         | Day 8–11  | 10    | 4 Critical     | Timeline UI + smart commits         |
| Phase 8  | Multi-Project Power    | Day 10–12 | 7     | 1 Critical     | Enhanced Harbor + cross-project     |
| Phase 9  | Task Orchestration     | Day 11–13 | 7     | 0 Critical     | Task graph + chaining               |
| Phase 10 | Safety + Polish        | Day 12–14 | 11    | 1 Critical     | Audit logging + performance         |
| Phase 11 | Ship MVP               | Day 14    | 9     | 5 Critical     | Signed macOS app + demo video       |
| Phase 12 | Post-Launch            | Post-MVP  | 12    | 0 Critical     | Plugin SDK + team sync + enterprise |

---

### Non-Negotiable Features (Do NOT Cut)

These five capabilities ARE the product. Cutting any one of them makes Forge just another editor with AI:

- **Activity Lanes** — parallel agent work with full context isolation
- **Command Ledger** — total execution visibility and auditability
- **Diff + Approval system** — safe, grouped, keyboard-driven review
- **BYOM support** — real model routing, not single-provider lock-in
- **Multi-project Harbor** — manage 3+ projects without desktop chaos

### Critical Path (Absolute Minimum for Launch)

If cutting scope hard, build only: Bay (single project UI), Monaco editor, Terminal, Basic agent (file edits), Diff + approval, Command Ledger, Simple preview. This alone is already better than most tools.

---

## Phase 0: Foundations (Day 0–1)

**Duration:** 1–2 days | **Goal:** Scaffolded desktop app with core data model and event store

### Project Setup

- [x] `0.01` **[CRITICAL]** Create GitHub repo: `forge`
- [x] `0.02` **[CRITICAL]** Initialize monorepo (pnpm + turbo) — _depends on: 0.01_
- [x] `0.03` **[CRITICAL]** Create packages: `apps/desktop`, `packages/ui`, `packages/core`, `packages/backend`, `packages/agents` — _depends on: 0.02_ — Est: 1h
- [x] `0.04` **[HIGH]** Configure TypeScript (strict mode) — _depends on: 0.02_ — Est: 0.5h
- [x] `0.05` **[HIGH]** Setup ESLint + Prettier — _depends on: 0.02_ — Est: 0.5h
- [x] `0.06` **[MEDIUM]** Setup Husky pre-commit hooks + lint-staged — _depends on: 0.05_ — Est: 0.5h
- [x] `0.07` **[HIGH]** Setup GitHub Actions CI (build + lint) — _depends on: 0.02_ — Est: 1h
- [x] `0.08` **[MEDIUM]** Add `.env.example` with documented variables — _depends on: 0.02_ — Est: 0.5h

### Desktop Shell

- [x] `0.09` **[CRITICAL]** Choose runtime: Tauri (preferred) or Electron — Est: 2h
- [x] `0.10` **[CRITICAL]** Create desktop app scaffold — _depends on: 0.09_ — Est: 2h
- [x] `0.11` **[HIGH]** Enable hot reload for UI development — _depends on: 0.10_ — Est: 1h
- [x] `0.12` **[MEDIUM]** Setup window state persistence — _depends on: 0.10_ — Est: 1h

### Core Architecture

- [x] `0.13` **[CRITICAL]** Define core data model (Bay, Lane, Task, Agent, Event) — Est: 3h
- [x] `0.14` **[CRITICAL]** Setup SQLite event store — _depends on: 0.13_ — Est: 2h
- [x] `0.15` **[CRITICAL]** Create IPC bridge (frontend ↔ backend) — _depends on: 0.10_ — Est: 3h

---

## Phase 1: Core UI + Project System (Day 1–3)

**Duration:** 2–3 days | **Goal:** Working Bay workspace with file tree, Monaco editor, and Harbor dashboard

### Harbor (Multi-Project Dashboard)

- [ ] `1.01` **[CRITICAL]** Create Harbor screen (multi-project dashboard) — _depends on: 0.15_ — Est: 3h
- [ ] `1.02` **[CRITICAL]** Build project list UI with status indicators — _depends on: 1.01_ — Est: 2h
- [ ] `1.03` **[HIGH]** Show per-project: branch, last activity, active lanes, pending approvals — _depends on: 1.02_ — Est: 3h
- [ ] `1.04` **[HIGH]** Add keyboard navigation between projects (↑ ↓ Enter) — _depends on: 1.02_ — Est: 1h
- [ ] `1.05` **[HIGH]** Add hotkeys for quick switch (Cmd+1 through Cmd+9) — _depends on: 1.04_ — Est: 1h

### Bay (Project Workspace)

- [ ] `1.06` **[CRITICAL]** Load project folder as Bay — _depends on: 0.15_ — Est: 2h
- [ ] `1.07` **[HIGH]** Persist Bay state across sessions — _depends on: 1.06_ — Est: 2h
- [ ] `1.08` **[CRITICAL]** Build 3-column layout (left rail, center, right rail) — _depends on: 1.06_ — Est: 4h
- [ ] `1.09` **[HIGH]** Build resizable split panes — _depends on: 1.08_ — Est: 3h

### File System

- [ ] `1.10` **[CRITICAL]** Build file tree component — _depends on: 1.06_ — Est: 3h
- [ ] `1.11` **[CRITICAL]** Implement expand/collapse folders — _depends on: 1.10_ — Est: 1h
- [ ] `1.12` **[CRITICAL]** Open file on click (tab system) — _depends on: 1.10_ — Est: 2h
- [ ] `1.13` **[HIGH]** Setup file watcher for external changes — _depends on: 1.10_ — Est: 2h

### Editor

- [ ] `1.14` **[CRITICAL]** Integrate Monaco editor — _depends on: 1.08_ — Est: 4h
- [ ] `1.15` **[CRITICAL]** Add syntax highlighting — _depends on: 1.14_ — Est: 1h
- [ ] `1.16` **[CRITICAL]** Add multi-tab support — _depends on: 1.14_ — Est: 2h
- [ ] `1.17` **[HIGH]** Add split editor panes — _depends on: 1.14_ — Est: 2h
- [ ] `1.18` **[CRITICAL]** Add file save (Cmd+S) — _depends on: 1.14_ — Est: 0.5h
- [ ] `1.19` **[HIGH]** Add basic LSP support — _depends on: 1.14_ — Est: 4h
- [ ] `1.20` **[MEDIUM]** Add symbol search — _depends on: 1.19_ — Est: 2h
- [ ] `1.21` **[MEDIUM]** Add go-to-definition — _depends on: 1.19_ — Est: 2h

---

## Phase 2: Terminal + Commands (Day 2–4)

**Duration:** 2–3 days | **Goal:** Tileable terminal grid with Command Ledger tracking all executions

### Terminal Grid

- [ ] `2.01` **[CRITICAL]** Integrate xterm.js terminal emulator — _depends on: 1.08_ — Est: 3h
- [ ] `2.02` **[CRITICAL]** Create terminal instance with PTY backend — _depends on: 2.01_ — Est: 3h
- [ ] `2.03` **[CRITICAL]** Add multiple terminals per Bay — _depends on: 2.02_ — Est: 2h
- [ ] `2.04` **[HIGH]** Add terminal tabs with rename support — _depends on: 2.03_ — Est: 1h
- [ ] `2.05` **[HIGH]** Add tileable terminal grid layout — _depends on: 2.03_ — Est: 3h
- [ ] `2.06` **[MEDIUM]** Persist terminal sessions across restarts — _depends on: 2.03_ — Est: 2h

### Command Execution + Ledger

- [ ] `2.07` **[CRITICAL]** Build command execution layer (run, capture stdout/stderr/exit) — _depends on: 2.02_ — Est: 3h
- [ ] `2.08` **[CRITICAL]** Build Command Ledger data model — _depends on: 0.14_ — Est: 2h
- [ ] `2.09` **[CRITICAL]** Log every command with metadata (cwd, env, duration, exit code) — _depends on: 2.07, 2.08_ — Est: 2h
- [ ] `2.10` **[HIGH]** Tag commands with lane and agent associations — _depends on: 2.09_ — Est: 1h
- [ ] `2.11` **[HIGH]** Build command history UI panel — _depends on: 2.09_ — Est: 3h
- [ ] `2.12` **[MEDIUM]** Add filters (by lane, agent, status, time range) — _depends on: 2.11_ — Est: 2h
- [ ] `2.13` **[MEDIUM]** Add replay command functionality — _depends on: 2.11_ — Est: 1h

---

## Phase 3: Agent Engine (Day 3–6)

**Duration:** 3–4 days | **Goal:** Multi-provider agent backend with BYOM config and permission system

### Model Abstraction Layer

- [ ] `3.01` **[CRITICAL]** Define agent adapter interface (inputs, outputs, lifecycle) — _depends on: 0.13_ — Est: 3h
- [ ] `3.02` **[CRITICAL]** Normalize agent outputs: file edits, commands, plans — _depends on: 3.01_ — Est: 2h
- [ ] `3.03` **[CRITICAL]** Implement OpenAI-compatible API client — _depends on: 3.01_ — Est: 3h
- [ ] `3.04` **[CRITICAL]** Add Anthropic native adapter — _depends on: 3.01_ — Est: 3h
- [ ] `3.05` **[HIGH]** Add Google Gemini adapter — _depends on: 3.01_ — Est: 2h
- [ ] `3.06` **[MEDIUM]** Add OpenRouter adapter — _depends on: 3.03_ — Est: 1h

### Local Models

- [ ] `3.07` **[HIGH]** Add Ollama local model integration — _depends on: 3.03_ — Est: 2h
- [ ] `3.08` **[MEDIUM]** Add LM Studio integration — _depends on: 3.03_ — Est: 1h

### BYOM Config

- [ ] `3.09` **[CRITICAL]** Build BYOM config UI (API keys, model selection) — _depends on: 3.03_ — Est: 4h
- [ ] `3.10` **[HIGH]** Implement per-role model routing rules — _depends on: 3.09_ — Est: 3h

### Agent Execution

- [ ] `3.11` **[CRITICAL]** Build agent runner (goal + context → actions) — _depends on: 3.02_ — Est: 6h
- [ ] `3.12` **[CRITICAL]** Define permission scopes (files, commands, network, browser) — _depends on: 3.11_ — Est: 3h
- [ ] `3.13` **[CRITICAL]** Enforce write restrictions per agent role — _depends on: 3.12_ — Est: 2h
- [ ] `3.14` **[HIGH]** Add approval hooks for restricted actions — _depends on: 3.12_ — Est: 2h
- [ ] `3.15` **[HIGH]** Build agent role templates (Builder, Tester, Reviewer, etc.) — _depends on: 3.12_ — Est: 3h

---

## Phase 4: Activity Lanes — Core Feature (Day 5–8)

**Duration:** 3–4 days | **Goal:** Lane system with parallel execution, checkpoints, and per-Lane rollback

### Lane Model

- [ ] `4.01` **[CRITICAL]** Create Lane entity model — _depends on: 0.13_ — Est: 2h
- [ ] `4.02` **[CRITICAL]** Attach goal, agent, model, file scope to Lane — _depends on: 4.01_ — Est: 2h
- [ ] `4.03` **[CRITICAL]** Store Lane state in SQLite — _depends on: 4.01, 0.14_ — Est: 1h

### Lane UI

- [ ] `4.04` **[CRITICAL]** Build Lane panel UI — _depends on: 1.08_ — Est: 4h
- [ ] `4.05` **[CRITICAL]** Add Lane switcher (Cmd+Shift+L) — _depends on: 4.04_ — Est: 1h
- [ ] `4.06` **[HIGH]** Show Lane status (running, paused, review, done) — _depends on: 4.04_ — Est: 2h

### Lane Execution

- [ ] `4.07` **[CRITICAL]** Track agent actions per Lane — _depends on: 4.02, 3.11_ — Est: 3h
- [ ] `4.08` **[CRITICAL]** Separate command logs per Lane — _depends on: 4.07, 2.09_ — Est: 2h
- [ ] `4.09` **[CRITICAL]** Separate diffs per Lane — _depends on: 4.07_ — Est: 2h

### Checkpoints

- [ ] `4.10` **[CRITICAL]** Build checkpoint snapshot system — _depends on: 4.01_ — Est: 4h
- [ ] `4.11` **[HIGH]** Add checkpoint labeling — _depends on: 4.10_ — Est: 1h
- [ ] `4.12` **[HIGH]** Add diff between checkpoints — _depends on: 4.10_ — Est: 2h
- [ ] `4.13` **[CRITICAL]** Add restore from checkpoint (per-Lane rollback) — _depends on: 4.10_ — Est: 3h
- [ ] `4.14` **[MEDIUM]** Add cherry-pick Lane into another branch — _depends on: 4.10_ — Est: 3h

---

## Phase 5: File Edits + Diff + Review (Day 6–9)

**Duration:** 3–4 days | **Goal:** Diff viewer with Lane-based grouping and keyboard-driven approval system

### File Editing Engine

- [ ] `5.01` **[CRITICAL]** Build programmatic file edit engine — _depends on: 1.14_ — Est: 3h
- [ ] `5.02` **[CRITICAL]** Track changes before write (proposed vs. applied) — _depends on: 5.01_ — Est: 2h
- [ ] `5.03` **[CRITICAL]** Store proposed edits with Lane association — _depends on: 5.02, 4.02_ — Est: 2h

### Diff Viewer

- [ ] `5.04` **[CRITICAL]** Build inline diff view — _depends on: 5.02_ — Est: 4h
- [ ] `5.05` **[HIGH]** Build side-by-side diff view — _depends on: 5.04_ — Est: 3h
- [ ] `5.06` **[CRITICAL]** Group changes by Lane in diff viewer — _depends on: 5.04, 4.09_ — Est: 2h
- [ ] `5.07` **[HIGH]** Highlight changed files in file tree — _depends on: 5.02, 1.10_ — Est: 1h

### Approval System

- [ ] `5.08` **[CRITICAL]** Build approval UI (approve/reject per edit) — _depends on: 5.03_ — Est: 3h
- [ ] `5.09` **[HIGH]** Add batch approval (approve all in Lane) — _depends on: 5.08_ — Est: 2h
- [ ] `5.10` **[CRITICAL]** Add keyboard shortcuts (Cmd+Enter approve, Cmd+Backspace reject) — _depends on: 5.08_ — Est: 1h
- [ ] `5.11` **[HIGH]** Build approval queue panel — _depends on: 5.08_ — Est: 2h
- [ ] `5.12` **[HIGH]** Implement approval policy modes (Manual/Balanced/Trusted) — _depends on: 5.08_ — Est: 3h

---

## Phase 6: Preview + Browser Automation (Day 7–10)

**Duration:** 3–4 days | **Goal:** Live preview panel and Playwright-based browser automation with agent control

### Live Preview

- [ ] `6.01` **[CRITICAL]** Embed webview component in right rail — _depends on: 1.08_ — Est: 3h
- [ ] `6.02` **[CRITICAL]** Load localhost URLs with configurable port — _depends on: 6.01_ — Est: 1h
- [ ] `6.03` **[HIGH]** Add auto-refresh on file save — _depends on: 6.01, 1.18_ — Est: 1h
- [ ] `6.04` **[MEDIUM]** Add mobile viewport presets — _depends on: 6.01_ — Est: 1h
- [ ] `6.05` **[HIGH]** Show console logs from preview — _depends on: 6.01_ — Est: 2h
- [ ] `6.06` **[HIGH]** Detect and display preview errors — _depends on: 6.05_ — Est: 1h

### Browser Automation

- [ ] `6.07` **[CRITICAL]** Integrate Playwright for browser automation — Est: 4h
- [ ] `6.08` **[CRITICAL]** Launch browser session from Lane — _depends on: 6.07, 4.07_ — Est: 2h
- [ ] `6.09` **[CRITICAL]** Implement agent browser actions (click, type, navigate) — _depends on: 6.07_ — Est: 4h
- [ ] `6.10` **[HIGH]** Add DOM inspection capability — _depends on: 6.07_ — Est: 2h
- [ ] `6.11` **[HIGH]** Capture and store screenshots with timeline integration — _depends on: 6.07_ — Est: 2h
- [ ] `6.12` **[MEDIUM]** Build replay flows for regression testing — _depends on: 6.09_ — Est: 3h
- [ ] `6.13` **[HIGH]** Implement human handoff (take over agent browser session) — _depends on: 6.08_ — Est: 3h

---

## Phase 7: Git + Timeline (Day 8–11)

**Duration:** 3 days | **Goal:** Visual execution timeline and smart Lane-based commit generation

### Git Integration

- [ ] `7.01` **[CRITICAL]** Detect git repo on project load — _depends on: 1.06_ — Est: 1h
- [ ] `7.02` **[CRITICAL]** Show current branch in Bay header — _depends on: 7.01_ — Est: 0.5h
- [ ] `7.03` **[HIGH]** Show changed files list — _depends on: 7.01_ — Est: 1h
- [ ] `7.04` **[CRITICAL]** Stage and commit changes — _depends on: 7.01_ — Est: 2h
- [ ] `7.05` **[HIGH]** Smart commit: group by Lane with conventional format — _depends on: 7.04, 4.02_ — Est: 3h
- [ ] `7.06` **[MEDIUM]** Auto-generate commit messages from Lane context — _depends on: 7.05_ — Est: 2h

### Timeline System

- [ ] `7.07` **[CRITICAL]** Build timeline event store (edits, commands, tests, screenshots) — _depends on: 0.14_ — Est: 3h
- [ ] `7.08` **[CRITICAL]** Build visual timeline UI — _depends on: 7.07_ — Est: 4h
- [ ] `7.09` **[HIGH]** Add timeline filters (by type, Lane, agent, time range) — _depends on: 7.08_ — Est: 2h
- [ ] `7.10` **[HIGH]** Integrate checkpoints into timeline view — _depends on: 7.08, 4.10_ — Est: 2h

---

## Phase 8: Multi-Project Power (Day 10–12)

**Duration:** 2–3 days | **Goal:** Enhanced Harbor dashboard with cross-project search and instant switching

### Harbor Enhancements

- [ ] `8.01` **[HIGH]** Show active agents per project in Harbor — _depends on: 1.03, 3.11_ — Est: 2h
- [ ] `8.02` **[HIGH]** Show failing tests per project in Harbor — _depends on: 1.03_ — Est: 2h
- [ ] `8.03` **[HIGH]** Show pending diffs count per project — _depends on: 1.03, 5.03_ — Est: 1h

### Fast Switching

- [ ] `8.04` **[CRITICAL]** Hotkeys for instant Bay switching — _depends on: 1.05_ — Est: 1h
- [ ] `8.05` **[HIGH]** Restore full UI state instantly on Bay switch — _depends on: 1.07_ — Est: 3h

### Cross-Project Operations

- [ ] `8.06` **[MEDIUM]** Cross-project symbol search — _depends on: 1.20_ — Est: 3h
- [ ] `8.07` **[MEDIUM]** Cross-project file comparison — _depends on: 5.04_ — Est: 2h

---

## Phase 9: Task Orchestration (Day 11–13)

**Duration:** 2–3 days | **Goal:** Native task graph system with chaining, conditionals, and parallel execution

### Task System

- [ ] `9.01` **[HIGH]** Define task model (command, agent, browser, test, deploy, git) — _depends on: 0.13_ — Est: 2h
- [ ] `9.02` **[HIGH]** Build task execution engine — _depends on: 9.01_ — Est: 3h
- [ ] `9.03` **[HIGH]** Build task definition UI — _depends on: 9.01_ — Est: 2h

### Task Orchestration

- [ ] `9.04` **[HIGH]** Implement sequential task chaining — _depends on: 9.02_ — Est: 2h
- [ ] `9.05` **[MEDIUM]** Implement conditional task steps — _depends on: 9.04_ — Est: 2h
- [ ] `9.06` **[MEDIUM]** Implement parallel task execution — _depends on: 9.04_ — Est: 3h
- [ ] `9.07` **[MEDIUM]** Add task graph visualization — _depends on: 9.04_ — Est: 3h

---

## Phase 10: Safety + Polish (Day 12–14)

**Duration:** 2–3 days | **Goal:** Enterprise-grade permissions, audit logging, and performance optimization

### Permissions UX

- [ ] `10.01` **[CRITICAL]** Build approval dialog UX (non-blocking, keyboard-first) — _depends on: 5.08_ — Est: 3h
- [ ] `10.02` **[HIGH]** Implement policy presets (Safe/Balanced/Trusted/Enterprise) — _depends on: 5.12_ — Est: 2h

### Security

- [ ] `10.03` **[HIGH]** Add audit logging for all agent actions — _depends on: 3.11_ — Est: 3h
- [ ] `10.04` **[MEDIUM]** Add network egress controls — Est: 2h
- [ ] `10.05` **[MEDIUM]** Add prompt/log redaction rules — Est: 2h

### Resilience

- [ ] `10.06` **[HIGH]** Implement agent retry logic on failure — _depends on: 3.11_ — Est: 2h
- [ ] `10.07` **[HIGH]** Implement graceful recovery from failed commands — _depends on: 2.07_ — Est: 2h

### Performance

- [ ] `10.08` **[HIGH]** Optimize file indexing for large repos — _depends on: 1.10_ — Est: 4h
- [ ] `10.09` **[HIGH]** Lazy load heavy UI panels — _depends on: 1.08_ — Est: 2h
- [ ] `10.10` **[MEDIUM]** Optimize SQLite query patterns — _depends on: 0.14_ — Est: 2h
- [ ] `10.11` **[HIGH]** Profile and fix memory leaks — Est: 3h

---

## Phase 11: Ship MVP (Day 14)

**Duration:** 1–2 days | **Goal:** Signed macOS app with documentation, landing page, and demo video

### Packaging

- [ ] `11.01` **[CRITICAL]** Build macOS app bundle — _depends on: 0.10_ — Est: 3h
- [ ] `11.02` **[CRITICAL]** Code sign macOS binary — _depends on: 11.01_ — Est: 2h
- [ ] `11.03` **[CRITICAL]** Create DMG installer — _depends on: 11.02_ — Est: 1h
- [ ] `11.04` **[HIGH]** Add auto-update mechanism — _depends on: 11.01_ — Est: 3h

### Documentation

- [ ] `11.05` **[CRITICAL]** Write README with quickstart guide — Est: 3h
- [ ] `11.06` **[HIGH]** Write feature overview documentation — Est: 3h

### Launch

- [ ] `11.07` **[CRITICAL]** Record demo video (CRITICAL for launch) — Est: 6h
- [ ] `11.08` **[CRITICAL]** Build landing page — Est: 4h
- [ ] `11.09` **[HIGH]** Post on X / Reddit / Hacker News — _depends on: 11.07, 11.08_ — Est: 2h

---

## Phase 12: Post-Launch Expansion

**Duration:** Ongoing | **Goal:** Team sync, Plugin SDK, enterprise features, and cross-platform builds

### Collaboration

- [ ] `12.01` **[HIGH]** Implement team sync service — Est: 8h
- [ ] `12.02` **[MEDIUM]** Build shared Lane templates — _depends on: 4.01_ — Est: 4h
- [ ] `12.03` **[HIGH]** Build handoff bundle export/import — _depends on: 4.02_ — Est: 4h
- [ ] `12.04` **[MEDIUM]** Build replayable agent sessions — _depends on: 3.11_ — Est: 6h

### Extensibility

- [ ] `12.05` **[HIGH]** Design and ship Plugin SDK — Est: 16h
- [ ] `12.06` **[MEDIUM]** Build language pack plugin template — _depends on: 12.05_ — Est: 4h
- [ ] `12.07` **[MEDIUM]** Build model provider plugin template — _depends on: 12.05_ — Est: 4h

### Cross-Platform

- [ ] `12.08` **[HIGH]** Add Windows build — _depends on: 11.01_ — Est: 4h
- [ ] `12.09` **[HIGH]** Add Linux build — _depends on: 11.01_ — Est: 4h

### Enterprise

- [ ] `12.10` **[MEDIUM]** Cloud execution sandbox option — Est: 16h
- [ ] `12.11` **[MEDIUM]** Enterprise policy management — _depends on: 10.02_ — Est: 8h
- [ ] `12.12` **[MEDIUM]** Self-hosted control plane for enterprises — _depends on: 12.01_ — Est: 16h

---

## Final Rule

> If it's not a checkbox, it's not real. This file is the source of truth for building Forge.

> If you ship even **60% of this cleanly**, it will feel radically better than current tools. Do NOT overbuild. Ship the control plane first.
