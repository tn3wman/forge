# Forge

Multi-platform Git & GitHub desktop app built with Tauri 2 + React 19 + TypeScript.

## Project Structure

- `apps/desktop/` — Tauri desktop app (React frontend + Rust backend)
- `packages/shared/` — Shared TypeScript types (IPC contracts)
- `packages/typescript-config/` — Shared TypeScript configs
- `packages/eslint-config/` — Shared ESLint config

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Vite + Tauri)
pnpm build            # Production build
pnpm test             # Run tests
pnpm lint             # Lint
```

## Architecture

- **Rust backend**: All GitHub API calls, Git operations, and token storage happen in Rust
- **Token security**: GitHub tokens stored in OS keychain (never in JS)
- **Data flow**: GitHub API → Rust → SQLite cache → Tauri event → React
- **State**: Zustand (client) + TanStack Query (server/async)
