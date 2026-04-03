# Performance Optimization Pass 2 - Findings Report

## Summary
Found 7 critical and moderate performance issues across TanStack Query polling, event listener cleanup, and Tauri event broadcasting.

---

## Issues Found

### 1. **CRITICAL: Event Listener Not Cleaned Up - Multiple Registrations**
**File:** `apps/desktop/src/hooks/useAgentSession.ts` (lines 455-470)

**Issue:** The `initAgentEventBridge()` function uses a global promise to ensure single initialization, BUT the `listen()` calls return unsubscribe functions that are **never stored or called**. This means:
- Multiple components can call `useAgentEventBridge()` repeatedly
- While the event listener setup itself is gated by `__forgeAgentBridgePromise`, the listeners are still active
- If session state changes force re-initialization, listeners can accumulate

**Impact:** Memory leak over long sessions; event handler duplication if the promise ever rejects and retries.

**Code Pattern:**
```typescript
listen<AgentEventPayload>("agent-event", (event) => { ... })
  // ^ Returns Promise<() => void> but promise is not captured
```

**Fix:** Capture the unsubscribe functions:
```typescript
const unlisteners = await Promise.all([
  listen<AgentEventPayload>("agent-event", handleAgentEvent),
  listen<AgentExitPayload>("agent-exit", handleAgentExit),
]);
// Store unlisteners or clean them up on unmount
```

---

### 2. **MODERATE: Aggressive Git Status Polling**
**File:** `apps/desktop/src/queries/useGitStatus.ts`

**Issue:** `refetchInterval: 5_000` means every 5 seconds, React Query re-runs the git status query across all active panes. 

**Impact:**
- Heavy I/O for `git status` calls every 5 seconds
- If user has multiple panes open, this multiplies
- No `staleTime` set, so every 5 seconds is a hard refetch (not just background)

**Recommendation:** Increase to 10-15 seconds OR set a `staleTime` and lower `refetchInterval`:
```typescript
staleTime: 5_000,
refetchInterval: 15_000,
```

---

### 3. **MODERATE: Query Refetch on Window Focus**
**File:** `apps/desktop/src/main.tsx` (line 9)

**Issue:** Default config has `refetchOnWindowFocus: true`. Combined with 60s refetch intervals, returning to the app triggers 4+ simultaneous queries:
- useIssues
- usePrDetail
- useNotifications
- useDashboard
- usePullRequests

**Impact:** Spike in API calls and renders when user alt-tabs back to the app.

**Recommendation:** Set `refetchOnWindowFocus: false` for Tauri desktop (different from web):
```typescript
refetchOnWindowFocus: false, // Desktop doesn't benefit, avoids network spike
```

---

### 4. **MODERATE: Missing `refetchInterval` on useSearch**
**File:** `apps/desktop/src/queries/useSearch.ts`

**Issue:** Has `staleTime: 30_000` but **no `refetchInterval`**, which means:
- Data marked stale after 30s, but only refetches if component remounts
- If user types, submits search, then doesn't navigate, data doesn't auto-update

**Recommendation:** Add `refetchInterval` or make it explicit that search results don't auto-update.

---

### 5. **HIGH: Terminal Event Listeners Have Cleanup, But Check Timing**
**File:** `apps/desktop/src/hooks/useTerminalSession.ts` (lines 30-52)

**Status:** ✅ GOOD - Listeners are properly cleaned up in return statement. No issue here.

**Confirmed:** Unlisteners promise array awaited in cleanup, disposables called. This is a pattern to replicate in useAgentSession.

---

### 6. **HIGH: Codex Backend Emitting Events in Hot Loop**
**File:** `apps/desktop/src-tauri/src/agent/codex_backend.rs` (lines 178-196, 322-340)

**Issue:** For every Codex notification (including streaming deltas), `app_handle.emit("agent-event", ...)` is called. This broadcasts to **all listeners** (including inactive sessions). 

**Pattern:** Similar to claude_backend.rs — both emit per-event, but Codex has additional duplicate suppression (lines 770-782) that's incomplete.

**Recommendation:** Same as discovered in first pass — batch events or implement session filtering before emit.

---

### 7. **MODERATE: useWorkspaceStore Selector Chain**
**File:** `apps/desktop/src/stores/workspaceStore.ts`

**Issue:** Store structure has `NavState` and other nested objects. If selectors don't use shallow equality properly, `useWorkspaceStore((s) => s.something)` can cause cascading re-renders.

**Recommendation:** Audit all usages for shallow equality. Check pattern like:
```typescript
useWorkspaceStore((s) => s.activeWorkspaceId)  // ✅ Primitive
useWorkspaceStore((s) => s.navState)           // ⚠️ Object, needs care
```

Check `usePullRequests` (uses `const { activeWorkspaceId } = useWorkspaceStore();`) — should verify this is a specific selector.

---

### 8. **LOW: Image Processing Re-encodes on Re-render**
**File:** `apps/desktop/src/components/agent/ChatInput.tsx` (UnifiedInputCard component)

**Issue:** `processFiles()` callback can re-read file to base64 if called multiple times due to conditional re-execution in `reader.onload` async callback.

**Pattern:**
```typescript
const processFiles = useCallback((files: FileList | File[]) => {
  const reader = new FileReader();
  reader.onload = () => { /* convert to base64 */ };
  reader.readAsDataURL(file);  // Runs every time processFiles is called
}, []);
```

**Recommendation:** Memoize or debounce file processing.

---

## TL;DR — Prioritized Fixes

| Priority | Issue | File | Est. Impact |
|----------|-------|------|-------------|
| **CRITICAL** | Event listeners not cleaned up | useAgentSession.ts | Memory leak, handler duplication |
| **HIGH** | Git status polling every 5s | useGitStatus.ts | High I/O, blocks UI |
| **HIGH** | Codex event emission in loop | codex_backend.rs | Broadcast to inactive sessions |
| **MEDIUM** | refetchOnWindowFocus = true | main.tsx | Network spike on focus |
| **MEDIUM** | Workspace store selector chain | workspaceStore.ts | Cascading re-renders |

---

## Follow-up Files to Modify

1. `apps/desktop/src/hooks/useAgentSession.ts` — Fix listener cleanup (CRITICAL)
2. `apps/desktop/src/queries/useGitStatus.ts` — Tune polling from 5s to 15s (HIGH)
3. `apps/desktop/src/main.tsx` — Set `refetchOnWindowFocus: false` (MEDIUM)
4. `apps/desktop/src/stores/workspaceStore.ts` — Verify selectors use shallow equality (MEDIUM)
5. `apps/desktop/src-tauri/src/agent/codex_backend.rs` — Batch or filter events (HIGH)

