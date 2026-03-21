# Forge

Agentic development environment — a desktop app built with Tauri v2, React, and TypeScript.

## Architecture

- **Monorepo:** pnpm workspaces + Turborepo
- **Desktop:** Tauri v2 (Rust backend + React frontend)
- **Database:** SQLite via rusqlite (event-sourced)
- **Frontend:** React 19 + TypeScript (strict)

## Packages

- `apps/desktop` — Tauri app (React frontend in `src/`, Rust backend in `src-tauri/`)
- `packages/core` — Shared TypeScript types (Bay, Lane, Task, Agent, Event)
- `packages/ui` — React component library
- `packages/backend` — Agent runner and orchestration logic
- `packages/agents` — Model provider adapters

## Commands

- `pnpm dev` — Start development (Vite + Tauri)
- `pnpm build` — Build all packages
- `pnpm test` — Run all TypeScript tests (Vitest)
- `pnpm lint` — Lint all packages
- `cd apps/desktop && pnpm tauri dev` — Launch the desktop app
- `cd apps/desktop/src-tauri && cargo test` — Run Rust tests

## IPC Pattern

Frontend communicates with Rust backend via Tauri's `invoke` command system:

1. Rust: `#[tauri::command]` functions in `src-tauri/src/commands/`
2. TypeScript: Type-safe wrappers in `apps/desktop/src/ipc/`
3. React: Hooks consume IPC wrappers

## Key Design Documents

- `design/Forge_Design_Spec.md` — Full product specification
- `design/Forge_Roadmap_Checklist.md` — Implementation roadmap (13 phases)
