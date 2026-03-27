# Agent Message Handling & Rendering - Complete Analysis

## 1. Message Store (agentStore.ts)

### AgentMessage Type Definition
```typescript
interface AgentMessage {
  id: string;
  type: "user" | "assistant" | "tool_use" | "tool_result" | "status" | "error" | "system";
  content: string;           // Main message content
  timestamp: number;
  collapsed: boolean;
  messageId?: string;        // Server-side message ID
  turnId?: string;           // Turn identifier
  streamState?: AgentStreamState; // "pending" | "streaming" | "completed" | "error"
  reasoning?: string;        // Extended thinking content
  reasoningState?: AgentStreamState;
  reasoningCollapsed?: boolean;
  toolName?: string;         // For tool_use messages
  toolInput?: Record<string, unknown>;
  toolInputText?: string;    // Stringified tool input
  toolUseId?: string;
  toolStatus?: string;
  detail?: string;
  approvalId?: string;
  resolved?: boolean;
  isError?: boolean;
  state?: AgentState;
  images?: ImageAttachment[]; // For user messages
}
```

### Key Functions:
- **createPendingAssistant()** - Creates empty assistant message with `content: ""` and `streamState: "pending"`
- **upsertAssistant()** - Creates or finds existing assistant message (searches by messageId, then turnId, then pending state)
- **startAssistantMessage()** - Sets messageId and updates streamState to "pending" or "streaming"
- **appendAssistantDelta()** - Appends text to content property, sets streamState to "streaming"
- **completeAssistantMessage()** - Sets final content, sets streamState to "completed"
- **fillEmptyAssistant()** - Used as fallback: checks if content is empty/whitespace, then fills it with text
- **markAssistantError()** - Sets streamState to "error", can set content if provided

### EMPTY MESSAGE CREATION ISSUE:
1. **createPendingAssistant()** creates message with `content: ""` (empty string)
2. **upsertAssistant()** in appendAssistantDelta also creates with `content: ""`
3. Messages stay empty if:
   - `assistant_message_start` event arrives but no delta events follow
   - Events are lost/skipped in the pipeline
   - Streaming is interrupted

## 2. Event Handling (useAgentSession.ts)

### Event Handler Flow:
```
"agent-event" listener → handleAgentEvent() → switch on event.type
```

### Key Event Cases:
- **assistant_message_start**: Calls `startAssistantMessage(sessionId, event.messageId, event.turnId)`
- **assistant_message_delta**: Calls `appendAssistantDelta(sessionId, event.messageId, event.contentDelta ?? "")`
- **assistant_message_complete**: Calls `completeAssistantMessage(sessionId, event.messageId, event.content, event.turnId)`
- **thinking_start**: Calls `createPendingAssistant(sessionId, event.turnId)`
- **reasoning_delta**: Calls `appendReasoningDelta(sessionId, event.contentDelta ?? "", event.messageId, event.turnId)`
- **result** (fallback): Calls `fillEmptyAssistant(sessionId, event.resultText)` if event.resultText exists

**Critical Detail**: The "result" event has a fallback mechanism:
```typescript
if (event.resultText) {
  store.fillEmptyAssistant(sessionId, event.resultText);
}
```
This only fills empty assistant IF resultText is provided and content is empty/whitespace.

## 3. Message Rendering (ChatView.tsx)

### Rendering Logic in ChatView.tsx:
```typescript
{messages.map((msg) => {
  if (msg.type === "tool_result") return null;  // FILTERED OUT
  if (msg.type === "tool_use") { /* ToolCallCard */ }
  if (msg.type === "status" && msg.state === "awaiting_approval" && !msg.resolved) { /* PermissionPrompt */ }
  if (msg.type === "status") { /* Text only */ }
  if (msg.type === "user" || msg.type === "assistant") { /* ChatMessage */ }
  if (msg.type === "system") { /* Text only */ }
  if (msg.type === "error") { /* Red text */ }
  return null;
})}
```

**NO FILTERING OF EMPTY MESSAGES** - All messages render, including empty ones.

### ChatMessage.tsx Component:
- Renders assistant messages with content
- Shows "Thinking..." if no content but streaming
- Shows reasoning section if reasoning exists
- **ISSUE**: Empty assistant messages with no reasoning render minimal content but still take up space

## 4. Root Cause Analysis: Empty Message Problem

### How Empty Messages Occur:
1. **assistant_message_start** arrives → creates message with `content: ""`
2. **No deltas arrive** (lost events, skipped, or never sent)
3. **assistant_message_complete** arrives with empty/missing content
4. Message stored with `content: ""`, possibly with `streamState: "completed"`

### Why They Persist:
1. **ChatView.tsx** has NO filter for empty messages
2. **fillEmptyAssistant()** only called if:
   - `result` event arrives AND
   - `event.resultText` is provided AND
   - content is empty/whitespace
3. If result event doesn't have text or never arrives → message stays empty

### Scenarios Where Empty Messages Occur:
- Streaming interrupted before deltas sent
- Event pipeline loss/reordering
- Message marked complete before content populated
- Tool execution that produces no visible output

## 5. Filtering Recommendations

### Current Filtering:
- ✓ tool_result messages are filtered in ChatView.tsx

### Missing Filtering:
- ✗ Empty assistant messages (should filter where `type === "assistant"` AND `content === ""` AND `content.trim().length === 0`)
- ✗ Empty reasoning-only messages (assistant message with reasoning but empty content)

### Safe Filtering Location:
In **ChatView.tsx** at the `.map()` loop, add check:
```typescript
if (msg.type === "assistant" && !msg.content?.trim() && !msg.reasoning?.trim()) {
  return null; // Skip completely empty messages
}
```

## File Paths:
- Store: `/Users/tyler/Projects/forge/apps/desktop/src/stores/agentStore.ts` (662 lines)
- Events: `/Users/tyler/Projects/forge/apps/desktop/src/hooks/useAgentSession.ts`
- Rendering: `/Users/tyler/Projects/forge/apps/desktop/src/components/agent/ChatView.tsx`
- Message UI: `/Users/tyler/Projects/forge/apps/desktop/src/components/agent/ChatMessage.tsx`
