# Thinking Events Flow Architecture

## Overview
Thinking events flow from the Claude API (via claude-agent-sdk) through claude-host, into Tauri events, and finally into the Zustand agent store in the desktop app UI.

---

## 1. Event Types Definition
**File:** `packages/shared/src/types/agent.ts`

```typescript
export type AgentEvent = 
  | { type: "thinking_start"; messageId: string; turnId?: string }
  | { type: "reasoning_delta"; contentDelta: string; messageId?: string; turnId?: string }
  | { type: "reasoning_complete"; messageId?: string; turnId?: string }
  // ... other event types
```

Key thinking-related fields:
- `thinking_start` / `reasoning_delta` / `reasoning_complete` are the event types
- `messageId`: Identifies which assistant message the thinking belongs to
- `turnId`: Optional identifier for the conversation turn
- `contentDelta`: The streamed thinking text chunk

---

## 2. Message Data Model
**File:** `apps/desktop/src/stores/agentStore.ts`

```typescript
export interface AgentMessage {
  id: string;                    // Local unique ID
  type: "user" | "assistant" | "tool_use" | "tool_result" | "status" | "error" | "system";
  content: string;               // Main response content
  timestamp: number;
  collapsed: boolean;
  
  // Thinking/Reasoning fields:
  reasoning?: string;            // Accumulated thinking content
  reasoningState?: AgentStreamState;  // "pending" | "streaming" | "completed" | "error"
  reasoningCollapsed?: boolean;  // Whether thinking is collapsed in UI
  
  // MessageId tracking:
  messageId?: string;            // Claude's message ID
  turnId?: string;               // Turn identifier
  streamState?: AgentStreamState;
  
  // Tool-related fields:
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolUseId?: string;
  // ... other tool fields
}
```

**Key insight:** The thinking content is stored in the `reasoning` field, separate from the main `content` field. This allows independent UI control and collapsibility.

---

## 3. Store Update Methods
**File:** `apps/desktop/src/stores/agentStore.ts`

The Zustand store provides dedicated methods for thinking state transitions:

```typescript
// Initialize an assistant message with empty thinking
createPendingAssistant: (sessionId: string, turnId?: string) => void

// Stream thinking text chunks
appendReasoningDelta: (sessionId, contentDelta, messageId, turnId) => void

// Mark thinking as complete and collapse by default
completeReasoning: (sessionId, messageId, turnId) => void
```

**Logic flow:**
1. `thinking_start` event → `createPendingAssistant()` creates assistant with empty reasoning
2. `reasoning_delta` events → `appendReasoningDelta()` accumulates thinking text
3. `reasoning_complete` event → `completeReasoning()` sets state to "completed" and auto-collapses

---

## 4. Event Handler
**File:** `apps/desktop/src/hooks/useAgentSession.ts`

Tauri event listener that dispatches to store:

```typescript
function handleAgentEvent(payload: AgentEventPayload) {
  const { sessionId, event } = payload;
  const store = useAgentStore.getState();

  switch (event.type) {
    case "thinking_start": {
      store.createPendingAssistant(sessionId, event.turnId);
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "reasoning_delta": {
      store.appendReasoningDelta(
        sessionId,
        event.contentDelta ?? "",
        event.messageId,
        event.turnId,
      );
      store.updateTabState(sessionId, "thinking");
      break;
    }
    case "reasoning_complete": {
      store.completeReasoning(sessionId, event.messageId, event.turnId);
      break;
    }
    // ... other cases
  }
}

// Tauri event listeners
listen<AgentEventPayload>("agent-event", handleAgentEvent)
```

---

## 5. Upstream Event Emission (Claude Host)
**File:** `apps/claude-host/src/index.ts`

The claude-host app listens to Claude SDK streaming events and transforms them to AgentEvents:

```typescript
if (event.type === "content_block_start") {
  const block = event.content_block;
  const blockType = block?.type;
  
  if (blockType === "thinking") {
    const messageId = session.activeAssistantId ?? `thinking-${Date.now()}`;
    session.activeThinkingId = messageId;
    emit({ type: "thinking_start", sessionId: session.sessionId, messageId });
    return;
  }
}

if (event.type === "content_block_delta") {
  const deltaType = event.content_block_delta?.type;
  
  if (deltaType === "thinking_delta" && typeof delta.thinking === "string") {
    emit({
      type: "thinking_delta",
      sessionId: session.sessionId,
      messageId: session.activeThinkingId ?? session.activeAssistantId ?? `thinking-${Date.now()}`,
      content: delta.thinking,
    });
  }
}
```

---

## 6. State Transition Diagram

```
User Message
    ↓
thinking_start
    ↓ (store.createPendingAssistant)
    → AssistantMessage { reasoning: "", reasoningState: "pending" }
    ↓
reasoning_delta (repeated)
    ↓ (store.appendReasoningDelta)
    → reasoning += contentDelta, reasoningState: "streaming", reasoningCollapsed: false
    ↓
reasoning_complete
    ↓ (store.completeReasoning)
    → reasoningState: "completed", reasoningCollapsed: true
    ↓
[Then assistant message content and tool calls continue...]
```

---

## 7. Key Architecture Insights

1. **Separation of Concerns:** Thinking is tracked independently in `reasoning`/`reasoningState`, allowing collapsible UI
2. **Message Batching:** Multiple turns can have different messageIds/turnIds tracked via `findAssistantIndex()` search logic
3. **State Idempotency:** Store methods check existing message state before updating (e.g., `upsertAssistant`)
4. **Tab-level State:** The `AgentTab` also tracks `state` ("idle" | "thinking" | "executing" | etc.) for UI indicators
5. **Local ID Generation:** For thinking with no explicit messageId, claude-host generates `thinking-${Date.now()}`

---

## Files to Reference

- `packages/shared/src/types/agent.ts` - Event & message types
- `apps/desktop/src/stores/agentStore.ts` - Zustand store with reasoning methods
- `apps/desktop/src/hooks/useAgentSession.ts` - Event bridge & handler
- `apps/claude-host/src/index.ts` - Upstream event emission from Claude SDK
