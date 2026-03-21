# FORGE: Implementation Roadmap Checklist

**Build-First, Ship-Fast Execution Plan**
Version 1.0 | March 2026 | 13 Phases | 142 Tasks | ~300 Engineering Hours to MVP

---

## Roadmap Overview

This is a **true execution checklist**. Every item represents a concrete task you can implement or verify. Tasks are sequenced by dependency, prioritized by criticality, and estimated in hours.

### Phase Summary

| Phase | Name | Duration | Tasks | Priority Items | Key Deliverable |
|---|---|---|---|---|---|
| Phase 0 | Foundations | Day 0–1 | 15 | 7 Critical | Scaffolded desktop app + data model |
| Phase 1 | Core UI + Project | Day 1–3 | 21 | 11 Critical | Bay workspace + Monaco editor |
| Phase 2 | Terminal + Commands | Day 2–4 | 13 | 6 Critical | Terminal grid + Command Ledger |
| Phase 3 | Agent Engine | Day 3–6 | 15 | 8 Critical | BYOM agent backend + permissions |
| Phase 4 | Activity Lanes | Day 5–8 | 14 | 8 Critical | Lane system + checkpoints |
| Phase 5 | Edits + Diffs + Review | Day 6–9 | 12 | 6 Critical | Diff viewer + approval system |
| Phase 6 | Preview + Browser | Day 7–10 | 13 | 5 Critical | Live preview + Playwright |
| Phase 7 | Git + Timeline | Day 8–11 | 10 | 4 Critical | Timeline UI + smart commits |
| Phase 8 | Multi-Project Power | Day 10–12 | 7 | 1 Critical | Enhanced Harbor + cross-project |
| Phase 9 | Task Orchestration | Day 11–13 | 7 | 0 Critical | Task graph + chaining |
| Phase 10 | Safety + Polish | Day 12–14 | 11 | 1 Critical | Audit logging + performance |
| Phase 11 | Ship MVP | Day 14 | 9 | 5 Critical | Signed macOS app + demo video |
| Phase 12 | Post-Launch | Post-MVP | 12 | 0 Critical | Plugin SDK + team sync + enterprise |

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

- [ ] `0.01` **[CRITICAL]** Create GitHub repo: `forge`
- [ ] `0.02` **[CRITICAL]** Initialize monorepo (pnpm + turbo) — *depends on: 0.01*
- [ ] `0.03` **[CRITICAL]** Create packages: `apps/desktop`, `packages/ui`, `packages/core`, `packages/backend`, `packages/agents` — *depends on: 0.02* — Est: 1h
- [ ] `0.04` **[HIGH]** Configure TypeScript (strict mode) — *depends on: 0.02* — Est: 0.5h
- [ ] `0.05` **[HIGH]** Setup ESLint + Prettier — *depends on: 0.02* — Est: 0.5h
- [ ] `0.06` **[MEDIUM]** Setup Husky pre-commit hooks + lint-staged — *depends on: 0.05* — Est: 0.5h
- [ ] `0.07` **[HIGH]** Setup GitHub Actions CI (build + lint) — *depends on: 0.02* — Est: 1h
- [ ] `0.08` **[MEDIUM]** Add `.env.example` with documented variables — *depends on: 0.02* — Est: 0.5h

### Desktop Shell

- [ ] `0.09` **[CRITICAL]** Choose runtime: Tauri (preferred) or Electron — Est: 2h
- [ ] `0.10` **[CRITICAL]** Create desktop app scaffold — *depends on: 0.09* — Est: 2h
- [ ] `0.11` **[HIGH]** Enable hot reload for UI development — *depends on: 0.10* — Est: 1h
- [ ] `0.12` **[MEDIUM]** Setup window state persistence — *depends on: 0.10* — Est: 1h

### Core Architecture

- [ ] `0.13` **[CRITICAL]** Define core data model (Bay, Lane, Task, Agent, Event) — Est: 3h
- [ ] `0.14` **[CRITICAL]** Setup SQLite event store — *depends on: 0.13* — Est: 2h
- [ ] `0.15` **[CRITICAL]** Create IPC bridge (frontend ↔ backend) — *depends on: 0.10* — Est: 3h

---

## Phase 1: Core UI + Project System (Day 1–3)

**Duration:** 2–3 days | **Goal:** Working Bay workspace with file tree, Monaco editor, and Harbor dashboard

### Harbor (Multi-Project Dashboard)

- [ ] `1.01` **[CRITICAL]** Create Harbor screen (multi-project dashboard) — *depends on: 0.15* — Est: 3h
- [ ] `1.02` **[CRITICAL]** Build project list UI with status indicators — *depends on: 1.01* — Est: 2h
- [ ] `1.03` **[HIGH]** Show per-project: branch, last activity, active lanes, pending approvals — *depends on: 1.02* — Est: 3h
- [ ] `1.04` **[HIGH]** Add keyboard navigation between projects (↑ ↓ Enter) — *depends on: 1.02* — Est: 1h
- [ ] `1.05` **[HIGH]** Add hotkeys for quick switch (Cmd+1 through Cmd+9) — *depends on: 1.04* — Est: 1h

### Bay (Project Workspace)

- [ ] `1.06` **[CRITICAL]** Load project folder as Bay — *depends on: 0.15* — Est: 2h
- [ ] `1.07` **[HIGH]** Persist Bay state across sessions — *depends on: 1.06* — Est: 2h
- [ ] `1.08` **[CRITICAL]** Build 3-column layout (left rail, center, right rail) — *depends on: 1.06* — Est: 4h
- [ ] `1.09` **[HIGH]** Build resizable split panes — *depends on: 1.08* — Est: 3h

### File System

- [ ] `1.10` **[CRITICAL]** Build file tree component — *depends on: 1.06* — Est: 3h
- [ ] `1.11` **[CRITICAL]** Implement expand/collapse folders — *depends on: 1.10* — Est: 1h
- [ ] `1.12` **[CRITICAL]** Open file on click (tab system) — *depends on: 1.10* — Est: 2h
- [ ] `1.13` **[HIGH]** Setup file watcher for external changes — *depends on: 1.10* — Est: 2h

### Editor

- [ ] `1.14` **[CRITICAL]** Integrate Monaco editor — *depends on: 1.08* — Est: 4h
- [ ] `1.15` **[CRITICAL]** Add syntax highlighting — *depends on: 1.14* — Est: 1h
- [ ] `1.16` **[CRITICAL]** Add multi-tab support — *depends on: 1.14* — Est: 2h
- [ ] `1.17` **[HIGH]** Add split editor panes — *depends on: 1.14* — Est: 2h
- [ ] `1.18` **[CRITICAL]** Add file save (Cmd+S) — *depends on: 1.14* — Est: 0.5h
- [ ] `1.19` **[HIGH]** Add basic LSP support — *depends on: 1.14* — Est: 4h
- [ ] `1.20` **[MEDIUM]** Add symbol search — *depends on: 1.19* — Est: 2h
- [ ] `1.21` **[MEDIUM]** Add go-to-definition — *depends on: 1.19* — Est: 2h

---

## Phase 2: Terminal + Commands (Day 2–4)

**Duration:** 2–3 days | **Goal:** Tileable terminal grid with Command Ledger tracking all executions

### Terminal Grid

- [ ] `2.01` **[CRITICAL]** Integrate xterm.js terminal emulator — *depends on: 1.08* — Est: 3h
- [ ] `2.02` **[CRITICAL]** Create terminal instance with PTY backend — *depends on: 2.01* — Est: 3h
- [ ] `2.03` **[CRITICAL]** Add multiple terminals per Bay — *depends on: 2.02* — Est: 2h
- [ ] `2.04` **[HIGH]** Add terminal tabs with rename support — *depends on: 2.03* — Est: 1h
- [ ] `2.05` **[HIGH]** Add tileable terminal grid layout — *depends on: 2.03* — Est: 3h
- [ ] `2.06` **[MEDIUM]** Persist terminal sessions across restarts — *depends on: 2.03* — Est: 2h

### Command Execution + Ledger

- [ ] `2.07` **[CRITICAL]** Build command execution layer (run, capture stdout/stderr/exit) — *depends on: 2.02* — Est: 3h
- [ ] `2.08` **[CRITICAL]** Build Command Ledger data model — *depends on: 0.14* — Est: 2h
- [ ] `2.09` **[CRITICAL]** Log every command with metadata (cwd, env, duration, exit code) — *depends on: 2.07, 2.08* — Est: 2h
- [ ] `2.10` **[HIGH]** Tag commands with lane and agent associations — *depends on: 2.09* — Est: 1h
- [ ] `2.11` **[HIGH]** Build command history UI panel — *depends on: 2.09* — Est: 3h
- [ ] `2.12` **[MEDIUM]** Add filters (by lane, agent, status, time range) — *depends on: 2.11* — Est: 2h
- [ ] `2.13` **[MEDIUM]** Add replay command functionality — *depends on: 2.11* — Est: 1h

---

## Phase 3: Agent Engine (Day 3–6)

**Duration:** 3–4 days | **Goal:** Multi-provider agent backend with BYOM config and permission system

### Model Abstraction Layer

- [ ] `3.01` **[CRITICAL]** Define agent adapter interface (inputs, outputs, lifecycle) — *depends on: 0.13* — Est: 3h
- [ ] `3.02` **[CRITICAL]** Normalize agent outputs: file edits, commands, plans — *depends on: 3.01* — Est: 2h
- [ ] `3.03` **[CRITICAL]** Implement OpenAI-compatible API client — *depends on: 3.01* — Est: 3h
- [ ] `3.04` **[CRITICAL]** Add Anthropic native adapter — *depends on: 3.01* — Est: 3h
- [ ] `3.05` **[HIGH]** Add Google Gemini adapter — *depends on: 3.01* — Est: 2h
- [ ] `3.06` **[MEDIUM]** Add OpenRouter adapter — *depends on: 3.03* — Est: 1h

### Local Models

- [ ] `3.07` **[HIGH]** Add Ollama local model integration — *depends on: 3.03* — Est: 2h
- [ ] `3.08` **[MEDIUM]** Add LM Studio integration — *depends on: 3.03* — Est: 1h

### BYOM Config

- [ ] `3.09` **[CRITICAL]** Build BYOM config UI (API keys, model selection) — *depends on: 3.03* — Est: 4h
- [ ] `3.10` **[HIGH]** Implement per-role model routing rules — *depends on: 3.09* — Est: 3h

### Agent Execution

- [ ] `3.11` **[CRITICAL]** Build agent runner (goal + context → actions) — *depends on: 3.02* — Est: 6h
- [ ] `3.12` **[CRITICAL]** Define permission scopes (files, commands, network, browser) — *depends on: 3.11* — Est: 3h
- [ ] `3.13` **[CRITICAL]** Enforce write restrictions per agent role — *depends on: 3.12* — Est: 2h
- [ ] `3.14` **[HIGH]** Add approval hooks for restricted actions — *depends on: 3.12* — Est: 2h
- [ ] `3.15` **[HIGH]** Build agent role templates (Builder, Tester, Reviewer, etc.) — *depends on: 3.12* — Est: 3h

---

## Phase 4: Activity Lanes — Core Feature (Day 5–8)

**Duration:** 3–4 days | **Goal:** Lane system with parallel execution, checkpoints, and per-Lane rollback

### Lane Model

- [ ] `4.01` **[CRITICAL]** Create Lane entity model — *depends on: 0.13* — Est: 2h
- [ ] `4.02` **[CRITICAL]** Attach goal, agent, model, file scope to Lane — *depends on: 4.01* — Est: 2h
- [ ] `4.03` **[CRITICAL]** Store Lane state in SQLite — *depends on: 4.01, 0.14* — Est: 1h

### Lane UI

- [ ] `4.04` **[CRITICAL]** Build Lane panel UI — *depends on: 1.08* — Est: 4h
- [ ] `4.05` **[CRITICAL]** Add Lane switcher (Cmd+Shift+L) — *depends on: 4.04* — Est: 1h
- [ ] `4.06` **[HIGH]** Show Lane status (running, paused, review, done) — *depends on: 4.04* — Est: 2h

### Lane Execution

- [ ] `4.07` **[CRITICAL]** Track agent actions per Lane — *depends on: 4.02, 3.11* — Est: 3h
- [ ] `4.08` **[CRITICAL]** Separate command logs per Lane — *depends on: 4.07, 2.09* — Est: 2h
- [ ] `4.09` **[CRITICAL]** Separate diffs per Lane — *depends on: 4.07* — Est: 2h

### Checkpoints

- [ ] `4.10` **[CRITICAL]** Build checkpoint snapshot system — *depends on: 4.01* — Est: 4h
- [ ] `4.11` **[HIGH]** Add checkpoint labeling — *depends on: 4.10* — Est: 1h
- [ ] `4.12` **[HIGH]** Add diff between checkpoints — *depends on: 4.10* — Est: 2h
- [ ] `4.13` **[CRITICAL]** Add restore from checkpoint (per-Lane rollback) — *depends on: 4.10* — Est: 3h
- [ ] `4.14` **[MEDIUM]** Add cherry-pick Lane into another branch — *depends on: 4.10* — Est: 3h

---

## Phase 5: File Edits + Diff + Review (Day 6–9)

**Duration:** 3–4 days | **Goal:** Diff viewer with Lane-based grouping and keyboard-driven approval system

### File Editing Engine

- [ ] `5.01` **[CRITICAL]** Build programmatic file edit engine — *depends on: 1.14* — Est: 3h
- [ ] `5.02` **[CRITICAL]** Track changes before write (proposed vs. applied) — *depends on: 5.01* — Est: 2h
- [ ] `5.03` **[CRITICAL]** Store proposed edits with Lane association — *depends on: 5.02, 4.02* — Est: 2h

### Diff Viewer

- [ ] `5.04` **[CRITICAL]** Build inline diff view — *depends on: 5.02* — Est: 4h
- [ ] `5.05` **[HIGH]** Build side-by-side diff view — *depends on: 5.04* — Est: 3h
- [ ] `5.06` **[CRITICAL]** Group changes by Lane in diff viewer — *depends on: 5.04, 4.09* — Est: 2h
- [ ] `5.07` **[HIGH]** Highlight changed files in file tree — *depends on: 5.02, 1.10* — Est: 1h

### Approval System

- [ ] `5.08` **[CRITICAL]** Build approval UI (approve/reject per edit) — *depends on: 5.03* — Est: 3h
- [ ] `5.09` **[HIGH]** Add batch approval (approve all in Lane) — *depends on: 5.08* — Est: 2h
- [ ] `5.10` **[CRITICAL]** Add keyboard shortcuts (Cmd+Enter approve, Cmd+Backspace reject) — *depends on: 5.08* — Est: 1h
- [ ] `5.11` **[HIGH]** Build approval queue panel — *depends on: 5.08* — Est: 2h
- [ ] `5.12` **[HIGH]** Implement approval policy modes (Manual/Balanced/Trusted) — *depends on: 5.08* — Est: 3h

---

## Phase 6: Preview + Browser Automation (Day 7–10)

**Duration:** 3–4 days | **Goal:** Live preview panel and Playwright-based browser automation with agent control

### Live Preview

- [ ] `6.01` **[CRITICAL]** Embed webview component in right rail — *depends on: 1.08* — Est: 3h
- [ ] `6.02` **[CRITICAL]** Load localhost URLs with configurable port — *depends on: 6.01* — Est: 1h
- [ ] `6.03` **[HIGH]** Add auto-refresh on file save — *depends on: 6.01, 1.18* — Est: 1h
- [ ] `6.04` **[MEDIUM]** Add mobile viewport presets — *depends on: 6.01* — Est: 1h
- [ ] `6.05` **[HIGH]** Show console logs from preview — *depends on: 6.01* — Est: 2h
- [ ] `6.06` **[HIGH]** Detect and display preview errors — *depends on: 6.05* — Est: 1h

### Browser Automation

- [ ] `6.07` **[CRITICAL]** Integrate Playwright for browser automation — Est: 4h
- [ ] `6.08` **[CRITICAL]** Launch browser session from Lane — *depends on: 6.07, 4.07* — Est: 2h
- [ ] `6.09` **[CRITICAL]** Implement agent browser actions (click, type, navigate) — *depends on: 6.07* — Est: 4h
- [ ] `6.10` **[HIGH]** Add DOM inspection capability — *depends on: 6.07* — Est: 2h
- [ ] `6.11` **[HIGH]** Capture and store screenshots with timeline integration — *depends on: 6.07* — Est: 2h
- [ ] `6.12` **[MEDIUM]** Build replay flows for regression testing — *depends on: 6.09* — Est: 3h
- [ ] `6.13` **[HIGH]** Implement human handoff (take over agent browser session) — *depends on: 6.08* — Est: 3h

---

## Phase 7: Git + Timeline (Day 8–11)

**Duration:** 3 days | **Goal:** Visual execution timeline and smart Lane-based commit generation

### Git Integration

- [ ] `7.01` **[CRITICAL]** Detect git repo on project load — *depends on: 1.06* — Est: 1h
- [ ] `7.02` **[CRITICAL]** Show current branch in Bay header — *depends on: 7.01* — Est: 0.5h
- [ ] `7.03` **[HIGH]** Show changed files list — *depends on: 7.01* — Est: 1h
- [ ] `7.04` **[CRITICAL]** Stage and commit changes — *depends on: 7.01* — Est: 2h
- [ ] `7.05` **[HIGH]** Smart commit: group by Lane with conventional format — *depends on: 7.04, 4.02* — Est: 3h
- [ ] `7.06` **[MEDIUM]** Auto-generate commit messages from Lane context — *depends on: 7.05* — Est: 2h

### Timeline System

- [ ] `7.07` **[CRITICAL]** Build timeline event store (edits, commands, tests, screenshots) — *depends on: 0.14* — Est: 3h
- [ ] `7.08` **[CRITICAL]** Build visual timeline UI — *depends on: 7.07* — Est: 4h
- [ ] `7.09` **[HIGH]** Add timeline filters (by type, Lane, agent, time range) — *depends on: 7.08* — Est: 2h
- [ ] `7.10` **[HIGH]** Integrate checkpoints into timeline view — *depends on: 7.08, 4.10* — Est: 2h

---

## Phase 8: Multi-Project Power (Day 10–12)

**Duration:** 2–3 days | **Goal:** Enhanced Harbor dashboard with cross-project search and instant switching

### Harbor Enhancements

- [ ] `8.01` **[HIGH]** Show active agents per project in Harbor — *depends on: 1.03, 3.11* — Est: 2h
- [ ] `8.02` **[HIGH]** Show failing tests per project in Harbor — *depends on: 1.03* — Est: 2h
- [ ] `8.03` **[HIGH]** Show pending diffs count per project — *depends on: 1.03, 5.03* — Est: 1h

### Fast Switching

- [ ] `8.04` **[CRITICAL]** Hotkeys for instant Bay switching — *depends on: 1.05* — Est: 1h
- [ ] `8.05` **[HIGH]** Restore full UI state instantly on Bay switch — *depends on: 1.07* — Est: 3h

### Cross-Project Operations

- [ ] `8.06` **[MEDIUM]** Cross-project symbol search — *depends on: 1.20* — Est: 3h
- [ ] `8.07` **[MEDIUM]** Cross-project file comparison — *depends on: 5.04* — Est: 2h

---

## Phase 9: Task Orchestration (Day 11–13)

**Duration:** 2–3 days | **Goal:** Native task graph system with chaining, conditionals, and parallel execution

### Task System

- [ ] `9.01` **[HIGH]** Define task model (command, agent, browser, test, deploy, git) — *depends on: 0.13* — Est: 2h
- [ ] `9.02` **[HIGH]** Build task execution engine — *depends on: 9.01* — Est: 3h
- [ ] `9.03` **[HIGH]** Build task definition UI — *depends on: 9.01* — Est: 2h

### Task Orchestration

- [ ] `9.04` **[HIGH]** Implement sequential task chaining — *depends on: 9.02* — Est: 2h
- [ ] `9.05` **[MEDIUM]** Implement conditional task steps — *depends on: 9.04* — Est: 2h
- [ ] `9.06` **[MEDIUM]** Implement parallel task execution — *depends on: 9.04* — Est: 3h
- [ ] `9.07` **[MEDIUM]** Add task graph visualization — *depends on: 9.04* — Est: 3h

---

## Phase 10: Safety + Polish (Day 12–14)

**Duration:** 2–3 days | **Goal:** Enterprise-grade permissions, audit logging, and performance optimization

### Permissions UX

- [ ] `10.01` **[CRITICAL]** Build approval dialog UX (non-blocking, keyboard-first) — *depends on: 5.08* — Est: 3h
- [ ] `10.02` **[HIGH]** Implement policy presets (Safe/Balanced/Trusted/Enterprise) — *depends on: 5.12* — Est: 2h

### Security

- [ ] `10.03` **[HIGH]** Add audit logging for all agent actions — *depends on: 3.11* — Est: 3h
- [ ] `10.04` **[MEDIUM]** Add network egress controls — Est: 2h
- [ ] `10.05` **[MEDIUM]** Add prompt/log redaction rules — Est: 2h

### Resilience

- [ ] `10.06` **[HIGH]** Implement agent retry logic on failure — *depends on: 3.11* — Est: 2h
- [ ] `10.07` **[HIGH]** Implement graceful recovery from failed commands — *depends on: 2.07* — Est: 2h

### Performance

- [ ] `10.08` **[HIGH]** Optimize file indexing for large repos — *depends on: 1.10* — Est: 4h
- [ ] `10.09` **[HIGH]** Lazy load heavy UI panels — *depends on: 1.08* — Est: 2h
- [ ] `10.10` **[MEDIUM]** Optimize SQLite query patterns — *depends on: 0.14* — Est: 2h
- [ ] `10.11` **[HIGH]** Profile and fix memory leaks — Est: 3h

---

## Phase 11: Ship MVP (Day 14)

**Duration:** 1–2 days | **Goal:** Signed macOS app with documentation, landing page, and demo video

### Packaging

- [ ] `11.01` **[CRITICAL]** Build macOS app bundle — *depends on: 0.10* — Est: 3h
- [ ] `11.02` **[CRITICAL]** Code sign macOS binary — *depends on: 11.01* — Est: 2h
- [ ] `11.03` **[CRITICAL]** Create DMG installer — *depends on: 11.02* — Est: 1h
- [ ] `11.04` **[HIGH]** Add auto-update mechanism — *depends on: 11.01* — Est: 3h

### Documentation

- [ ] `11.05` **[CRITICAL]** Write README with quickstart guide — Est: 3h
- [ ] `11.06` **[HIGH]** Write feature overview documentation — Est: 3h

### Launch

- [ ] `11.07` **[CRITICAL]** Record demo video (CRITICAL for launch) — Est: 6h
- [ ] `11.08` **[CRITICAL]** Build landing page — Est: 4h
- [ ] `11.09` **[HIGH]** Post on X / Reddit / Hacker News — *depends on: 11.07, 11.08* — Est: 2h

---

## Phase 12: Post-Launch Expansion

**Duration:** Ongoing | **Goal:** Team sync, Plugin SDK, enterprise features, and cross-platform builds

### Collaboration

- [ ] `12.01` **[HIGH]** Implement team sync service — Est: 8h
- [ ] `12.02` **[MEDIUM]** Build shared Lane templates — *depends on: 4.01* — Est: 4h
- [ ] `12.03` **[HIGH]** Build handoff bundle export/import — *depends on: 4.02* — Est: 4h
- [ ] `12.04` **[MEDIUM]** Build replayable agent sessions — *depends on: 3.11* — Est: 6h

### Extensibility

- [ ] `12.05` **[HIGH]** Design and ship Plugin SDK — Est: 16h
- [ ] `12.06` **[MEDIUM]** Build language pack plugin template — *depends on: 12.05* — Est: 4h
- [ ] `12.07` **[MEDIUM]** Build model provider plugin template — *depends on: 12.05* — Est: 4h

### Cross-Platform

- [ ] `12.08` **[HIGH]** Add Windows build — *depends on: 11.01* — Est: 4h
- [ ] `12.09` **[HIGH]** Add Linux build — *depends on: 11.01* — Est: 4h

### Enterprise

- [ ] `12.10` **[MEDIUM]** Cloud execution sandbox option — Est: 16h
- [ ] `12.11` **[MEDIUM]** Enterprise policy management — *depends on: 10.02* — Est: 8h
- [ ] `12.12` **[MEDIUM]** Self-hosted control plane for enterprises — *depends on: 12.01* — Est: 16h

---

## Final Rule

> If it's not a checkbox, it's not real. This file is the source of truth for building Forge.

> If you ship even **60% of this cleanly**, it will feel radically better than current tools. Do NOT overbuild. Ship the control plane first.
