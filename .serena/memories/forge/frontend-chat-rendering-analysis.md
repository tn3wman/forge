# Frontend Agent Chat Message Rendering - Complete Analysis

## Overview
The Tauri desktop app renders agent chat messages through a multi-component system with different renderers for different message types. Messages flow through the store (agentStore.ts) and are rendered by specialized React components.

---

## 1. MESSAGE TYPE ARCHITECTURE

### AgentMessage Interface (agentStore.ts)
```typescript
interface AgentMessage {
  id: string;
  type: "user" | "assistant" | "tool_use" | "tool_result" | "status" | "error" | "system";
  content: string;
  timestamp: number;
  collapsed: boolean;
  
  // Assistant-specific fields
  messageId?: string;
  turnId?: string;
  streamState?: "pending" | "streaming" | "completed" | "error";
  reasoning?: string;
  reasoningState?: AgentStreamState;
  reasoningCollapsed?: boolean;
  
  // Tool-use specific fields
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolInputText?: string;
  toolUseId?: string;
  toolStatus?: string;
  
  // Other fields
  detail?: string;
  approvalId?: string;
  resolved?: boolean;
  isError?: boolean;
  state?: AgentState;
  images?: ImageAttachment[];
}
```

### Message Types:
1. **user** - User input messages with optional images
2. **assistant** - AI responses with markdown content and optional reasoning
3. **tool_use** - Tool calls initiated by the assistant
4. **tool_result** - Results from executed tools (filtered out in display)
5. **status** - System status updates, permission prompts
6. **error** - Error messages
7. **system** - System messages

---

## 2. MESSAGE RENDERING FLOW

### ChatView.tsx (apps/desktop/src/components/agent/ChatView.tsx)
**Purpose**: Main message container that orchestrates all message rendering

**Key Logic**:
```typescript
// Builds a map of toolUseId -> tool_result for pairing with tool_use messages
const toolResultMap = useMemo(() => {
  const map = new Map<string, AgentMessage>();
  for (const msg of messages) {
    if (msg.type === "tool_result" && msg.toolUseId) {
      map.set(msg.toolUseId, msg);
    }
  }
  return map;
}, [messages]);

// Renders messages with type-specific handlers
messages.map((msg) => {
  if (msg.type === "tool_result") return null;  // FILTERED OUT
  if (msg.type === "tool_use") { /* ToolCallCard */ }
  if (msg.type === "status" && msg.state === "awaiting_approval" && !msg.resolved) { /* PermissionPrompt */ }
  if (msg.type === "status") { /* Text only */ }
  if (msg.type === "user" || msg.type === "assistant") { /* ChatMessage */ }
  if (msg.type === "system") { /* Text only */ }
  if (msg.type === "error") { /* Red text */ }
})
```

**Auto-scroll**: Uses ref to scroll to bottom on message changes
**Keyboard shortcuts**: y/n keys for permission prompts when not focused on input

---

## 3. COMPONENT RENDERERS

### ChatMessage.tsx (apps/desktop/src/components/agent/ChatMessage.tsx)
**Renders**: user + assistant messages

**User Message Rendering**:
- Icon (User avatar)
- Plain text content (whitespace-pre-wrap preserves formatting)
- Optional images as base64 data URIs
- Right-aligned styling (flex-row-reverse)

**Assistant Message Rendering**:
- Icon (Bot avatar)
- **Markdown rendering** using ReactMarkdown:
  - Wraps content in `prose prose-sm prose-invert` Tailwind classes
  - Supports GFM (GitHub Flavored Markdown) via remark-gfm dependency
  - Full markdown support: lists, code blocks, tables, emphasis, links
- **Streaming indicator**: Shows "Thinking..." or "Streaming response" with spinner
- **Reasoning section**:
  - Collapsible section with Brain icon
  - Shows first line summary when collapsed
  - Displays full reasoning when expanded
  - Shows spinner if reasoning is still streaming

**Streaming State Handling**:
```typescript
const isAssistantStreaming = !isUser && (message.streamState === "pending" || message.streamState === "streaming");
const hasReasoning = !isUser && !!message.reasoning;
```

---

### ToolCallCard.tsx (apps/desktop/src/components/agent/ToolCallCard.tsx)
**Renders**: tool_use + paired tool_result messages

**Structure**:
- Collapsible card with tool name
- Status indicator: 
  - Spinner (pending)
  - Green check (success)
  - Red X (error)

**Collapsed View**: Shows tool name and status only

**Expanded View**:
- **Input section**: tool.toolInput (JSON) or tool.toolInputText
- **Status section**: tool.toolStatus if available
- **Output section**: tool_result.content 
  - Shows "Waiting for tool output..." if pending
  - Shows "Tool completed without output." if no content
  - Displays error text if isError = true

**Key Rendering Details**:
- Input/output displayed in `<pre><code>` blocks
- Max height 48rem with auto scroll
- Syntax highlighting: None (plain text, no language-specific highlighting)
- No diff rendering (plain text display)

---

### PermissionPrompt.tsx
**Renders**: status messages with state === "awaiting_approval"
- Shows permission request to user
- Responds via agentIpc.respondPermission()

---

## 4. MARKDOWN & FORMATTING CAPABILITIES

### Currently Enabled:
✓ **ReactMarkdown** (react-markdown ^10.1.0)
✓ **Remark GFM** (remark-gfm ^4.0.1) - GitHub Flavored Markdown
  - Tables
  - Strikethrough
  - Task lists
  - Autolinks
✓ **Tailwind prose** classes for styling
✓ **Code block support** via markdown
✓ **User image attachments** (base64 data URIs)

### Available But Not Used:
- **CodeMirror markdown** (@codemirror/lang-markdown ^6.5.0) - installed but not used in chat rendering
- Syntax highlighting for code blocks (no language-specific highlighting)
- Diff rendering (not implemented)

### NOT Implemented:
✗ Syntax highlighting in code blocks
✗ Line numbers in code blocks
✗ Diff/patch rendering
✗ Mermaid diagrams
✗ HTML escaping (ReactMarkdown handles this)
✗ Custom link handling
✗ File syntax highlighting in tool results

---

## 5. MESSAGE FILTERING & DISPLAY RULES

### In ChatView.tsx:

**Filtered Out**:
- tool_result messages (filtered in .map() with early return)

**Always Rendered** (even if problematic):
- Empty assistant messages (no content filter)
- Streaming messages with no content
- Messages with only reasoning, no text

**Special Cases**:
- Permission prompts: Only shown if state === "awaiting_approval" && !msg.resolved
- Status messages: All rendered except awaiting_approval
- Error messages: Rendered in red

---

## 6. STREAMING & REAL-TIME UPDATES

### Stream State Values:
- **pending**: Message created, waiting for content
- **streaming**: Content being appended
- **completed**: Final content received
- **error**: Stream failed

### Visual Indicators:
- Spinner in ChatMessage when streaming
- Spinner in ToolCallCard when result pending
- "Thinking..." text for empty pending assistant messages
- "Streaming response" text for non-empty streaming messages

---

## 7. KEY FILE LOCATIONS

| File | Purpose | Lines |
|------|---------|-------|
| apps/desktop/src/components/agent/ChatView.tsx | Main message container | ~190 |
| apps/desktop/src/components/agent/ChatMessage.tsx | User + assistant renderer | ~110 |
| apps/desktop/src/components/agent/ToolCallCard.tsx | Tool call + result renderer | ~90 |
| apps/desktop/src/components/agent/PermissionPrompt.tsx | Permission request UI | ? |
| apps/desktop/src/stores/agentStore.ts | Message store + types | ~662 |

---

## 8. RENDERING SUMMARY TABLE

| Message Type | Component | Content Type | Features |
|--------------|-----------|--------------|----------|
| user | ChatMessage | Plain text + images | Images as base64 |
| assistant | ChatMessage | Markdown | GFM, streaming, reasoning |
| tool_use | ToolCallCard | JSON input | Collapsible, paired with result |
| tool_result | ToolCallCard | Plain text/JSON | Hides from main view, shown in card |
| status | ChatView | Plain text | Small gray text |
| error | ChatView | Plain text | Red text |
| system | ChatView | Plain text | Small gray text |

---

## 9. GAPS & OBSERVATIONS

### Current Limitations:
1. **No syntax highlighting** - Code blocks in markdown render without language detection
2. **No diff rendering** - Tool results with diffs show as plain text
3. **Tool result filtering** - Hidden from main view, only accessible in collapsed cards
4. **No empty message filtering** - Empty assistant messages still render
5. **No custom renderers** - All markdown uses default ReactMarkdown behavior
6. **No async content loading** - All content must be pre-loaded

### Potential Enhancements:
- Add language-aware syntax highlighting (e.g., prismjs)
- Add diff/patch rendering
- Filter empty messages
- Add custom markdown components for special content types
- Add support for structured data visualization
- Add code copy buttons
