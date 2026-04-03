import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  CanUseTool,
  PermissionMode,
  PermissionResult,
  SDKMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { createInterface } from "node:readline";
import { once } from "node:events";

type HostCommand =
  | {
      type: "get_capabilities";
      requestId: string;
      claudePath?: string | null;
    }
  | {
      type: "start_session";
      requestId: string;
      sessionId: string;
      cwd?: string | null;
      prompt: string;
      model?: string | null;
      permissionMode?: string | null;
      underlyingPermissionMode?: string | null;
      effort?: string | null;
      agent?: string | null;
      claudePath?: string | null;
    }
  | {
      type: "send_user_message";
      requestId: string;
      sessionId: string;
      prompt: string;
      images?: Array<{ data: string; mediaType: string }>;
    }
  | {
      type: "respond_approval";
      requestId: string;
      sessionId: string;
      approvalId: string;
      allow: boolean;
    }
  | {
      type: "interrupt_turn";
      requestId: string;
      sessionId: string;
    }
  | {
      type: "update_permission_mode";
      requestId: string;
      sessionId: string;
      permissionMode: string;
    }
  | {
      type: "end_session";
      requestId: string;
      sessionId: string;
    };

type HostEvent =
  | {
      type: "command_result";
      requestId: string;
      ok: true;
      result?: Record<string, unknown>;
    }
  | {
      type: "command_result";
      requestId: string;
      ok: false;
      error: string;
    }
  | {
      type: "session_init";
      sessionId: string;
      claudeSessionId?: string;
      model?: string;
      permissionMode?: string;
      tools?: string[];
      slashCommands?: { name: string; description: string; category: string; source?: string }[];
    }
  | {
      type: "session_meta";
      sessionId: string;
      agent?: string | null;
      effort?: string | null;
      claudePath?: string | null;
      slashCommands?: { name: string; description: string; category: string; source?: string }[];
    }
  | {
      type: "assistant_start";
      sessionId: string;
      messageId: string;
    }
  | {
      type: "assistant_delta";
      sessionId: string;
      messageId: string;
      content: string;
    }
  | {
      type: "assistant_complete";
      sessionId: string;
      messageId: string;
      content?: string;
    }
  | {
      type: "thinking_start";
      sessionId: string;
      messageId: string;
    }
  | {
      type: "thinking_delta";
      sessionId: string;
      messageId: string;
      content: string;
    }
  | {
      type: "thinking_complete";
      sessionId: string;
      messageId: string;
      content?: string;
    }
  | {
      type: "tool_start";
      sessionId: string;
      toolUseId: string;
      toolName: string;
      input?: Record<string, unknown>;
    }
  | {
      type: "tool_input_delta";
      sessionId: string;
      toolUseId: string;
      inputDelta: string;
    }
  | {
      type: "tool_progress";
      sessionId: string;
      toolUseId?: string;
      toolName?: string;
      status: string;
    }
  | {
      type: "tool_output_delta";
      sessionId: string;
      toolUseId: string;
      content: string;
      isError?: boolean;
    }
  | {
      type: "tool_complete";
      sessionId: string;
      toolUseId: string;
      content?: string;
      isError?: boolean;
    }
  | {
      type: "approval_requested";
      sessionId: string;
      approvalId: string;
      toolUseId?: string;
      toolName: string;
      input?: Record<string, unknown>;
      detail: string;
    }
  | {
      type: "approval_resolved";
      sessionId: string;
      approvalId: string;
      allow: boolean;
    }
  | {
      type: "result";
      sessionId: string;
      resultText: string;
      durationMs?: number;
      totalCostUsd?: number;
      isError: boolean;
    }
  | {
      type: "runtime_error";
      sessionId: string;
      message: string;
    };

interface QueueItem {
  resolve: () => void;
  message: SDKUserMessage;
}

interface PendingApproval {
  approvalId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  resolve: (result: PermissionResult) => void;
}

interface ClaudeSession {
  sessionId: string;
  cwd?: string | null;
  permissionMode?: string | null;
  underlyingPermissionMode?: string | null;
  claudePath?: string | null;
  agent?: string | null;
  effort?: string | null;
  promptQueue: QueueItem[];
  nextPrompt?: () => void;
  pendingApprovals: Map<string, PendingApproval>;
  activeAssistantId?: string;
  activeThinkingId?: string;
  activeToolUseId?: string;
  toolInputBuffers: Map<string, string>;
  queryRuntime: any;
  streamPromise: Promise<void>;
  closed: boolean;
}

const sessions = new Map<string, ClaudeSession>();

function emit(event: HostEvent) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

function emitResult(requestId: string, result?: Record<string, unknown>) {
  emit({ type: "command_result", requestId, ok: true, result });
}

function emitError(requestId: string, error: unknown) {
  emit({
    type: "command_result",
    requestId,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
}

function buildUserMessage(
  prompt: string,
  images?: Array<{ data: string; mediaType: string }>,
): SDKUserMessage {
  const content =
    images && images.length > 0
      ? [
          ...images.map((img) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: img.mediaType,
              data: img.data,
            },
          })),
          { type: "text" as const, text: prompt },
        ]
      : prompt;

  return {
    type: "user",
    message: {
      role: "user",
      content,
    },
    parent_tool_use_id: null,
    session_id: "",
  };
}

function summarizeToolRequest(toolName: string, input: Record<string, unknown>) {
  try {
    const serialized = JSON.stringify(input);
    return serialized.length > 160 ? `${toolName} ${serialized.slice(0, 157)}...` : `${toolName} ${serialized}`;
  } catch {
    return toolName;
  }
}

async function* promptStream(session: ClaudeSession): AsyncGenerator<SDKUserMessage> {
  while (!session.closed) {
    if (session.promptQueue.length === 0) {
      await new Promise<void>((resolve) => {
        session.nextPrompt = resolve;
      });
      session.nextPrompt = undefined;
      continue;
    }

    const next = session.promptQueue.shift();
    if (!next) continue;
    yield next.message;
    next.resolve();
  }
}

async function enqueuePrompt(
  session: ClaudeSession,
  prompt: string,
  images?: Array<{ data: string; mediaType: string }>,
) {
  await new Promise<void>((resolve) => {
    session.promptQueue.push({ message: buildUserMessage(prompt, images), resolve });
    session.nextPrompt?.();
  });
}

function contentText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .flatMap((block) => {
      if (!block || typeof block !== "object") return [];
      const record = block as { type?: unknown; text?: unknown };
      return record.type === "text" && typeof record.text === "string" ? [record.text] : [];
    })
    .join("");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringifyToolResult(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return undefined;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function createCapabilitiesQuery(claudePath?: string | null) {
  const runtime = query({
    prompt: (async function* () {})(),
    options: {
      includePartialMessages: true,
      ...(claudePath ? { pathToClaudeCodeExecutable: claudePath } : {}),
    } as Record<string, unknown>,
  }) as any;

  try {
    const init = typeof runtime.initializationResult === "function"
      ? await runtime.initializationResult()
      : undefined;
    const commands = typeof runtime.supportedCommands === "function"
      ? await runtime.supportedCommands()
      : [];
    return {
      init,
      commands: Array.isArray(commands)
        ? commands.map((command: any) => ({
            name: String(command.name ?? ""),
            description: String(command.description ?? ""),
            category: "builtin",
            ...(command.source ? { source: String(command.source) } : {}),
          }))
        : [],
    };
  } finally {
    try {
      runtime.close?.();
    } catch {
      // ignore close failures
    }
  }
}

function toSdkPermissionMode(mode?: string | null): PermissionMode | undefined {
  switch (mode) {
    case "plan": return "plan";
    case "supervised": return "default";
    case "assisted": return "acceptEdits";
    case "fullAccess": return "bypassPermissions";
    default: return undefined;
  }
}

const READ_ONLY_TOOLS = new Set([
  "Read",
  "Glob",
  "Grep",
  "LSP",
  "WebSearch",
  "WebFetch",
  "Agent",
  "TodoRead",
  "ListMcpResourcesTool",
  "ReadMcpResourceTool",
  // Non-destructive SDK tools that should auto-approve
  "ExitPlanMode",
  "EnterPlanMode",
]);

async function startSession(command: Extract<HostCommand, { type: "start_session" }>) {
  if (sessions.has(command.sessionId)) {
    throw new Error(`Session '${command.sessionId}' already exists`);
  }

  const pendingApprovals = new Map<string, PendingApproval>();
  const session: ClaudeSession = {
    sessionId: command.sessionId,
    cwd: command.cwd,
    permissionMode: command.permissionMode ?? undefined,
    underlyingPermissionMode: command.underlyingPermissionMode ?? command.permissionMode ?? undefined,
    claudePath: command.claudePath ?? undefined,
    agent: command.agent ?? undefined,
    effort: command.effort ?? undefined,
    promptQueue: [],
    pendingApprovals,
    toolInputBuffers: new Map(),
    queryRuntime: undefined,
    streamPromise: Promise.resolve(),
    closed: false,
  };

  const canUseTool: CanUseTool = (toolName, toolInput, callbackOptions) => {
    // Plan mode is always dominant — never fall through to a more permissive underlying mode
    const effectiveMode = session.permissionMode === "plan"
      ? "plan"
      : (session.underlyingPermissionMode ?? session.permissionMode);
    // Full Access: auto-approve all tools
    if (effectiveMode === "fullAccess") {
      return Promise.resolve({ behavior: "allow" as const, updatedInput: asRecord(toolInput) ?? {} });
    }

    // Plan mode: auto-approve non-destructive tools
    if (effectiveMode === "plan" && READ_ONLY_TOOLS.has(toolName)) {
      return Promise.resolve({ behavior: "allow" as const, updatedInput: asRecord(toolInput) ?? {} });
    }

    // Assisted: auto-approve read-only tools, prompt for writes
    if (effectiveMode === "assisted" && READ_ONLY_TOOLS.has(toolName)) {
      return Promise.resolve({ behavior: "allow" as const, updatedInput: asRecord(toolInput) ?? {} });
    }

    // Supervised (default): prompt for everything
    return new Promise<PermissionResult>((resolve) => {
      const approvalId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const normalizedInput = asRecord(toolInput) ?? {};
      pendingApprovals.set(approvalId, {
        approvalId,
        toolName,
        toolInput: normalizedInput,
        resolve,
      });
      emit({
        type: "approval_requested",
        sessionId: session.sessionId,
        approvalId,
        toolUseId: callbackOptions.toolUseID,
        toolName,
        input: normalizedInput,
        detail: summarizeToolRequest(toolName, normalizedInput),
      });
    });
  };

  session.queryRuntime = query({
    prompt: promptStream(session),
    options: {
      cwd: command.cwd ?? undefined,
      includePartialMessages: true,
      permissionMode: toSdkPermissionMode(command.permissionMode),
      ...(toSdkPermissionMode(command.permissionMode) === "bypassPermissions" ||
          toSdkPermissionMode(command.underlyingPermissionMode) === "bypassPermissions"
        ? { allowDangerouslySkipPermissions: true }
        : {}),
      maxThinkingTokens: command.effort === "high" ? 12000 : undefined,
      pathToClaudeCodeExecutable: command.claudePath ?? undefined,
      canUseTool,
      settingSources: ["user", "project", "local"],
      systemPrompt: { type: "preset", preset: "claude_code" },
      ...(command.model ? { model: command.model } : {}),
      ...(command.agent ? { agent: command.agent } : {}),
    } as Record<string, unknown>,
  }) as any;

  sessions.set(session.sessionId, session);

  const capabilitiesPromise =
    typeof session.queryRuntime.supportedCommands === "function"
      ? session.queryRuntime.supportedCommands().catch(() => [])
      : Promise.resolve([]);

  session.streamPromise = (async () => {
    try {
      for await (const message of session.queryRuntime as AsyncIterable<SDKMessage>) {
        handleSdkMessage(session, message, await capabilitiesPromise);
      }
    } catch (error) {
      emit({
        type: "runtime_error",
        sessionId: session.sessionId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  // Fire-and-forget: the prompt is pushed to the queue synchronously inside
  // enqueuePrompt, so the SDK will consume it. We must NOT await here because
  // enqueuePrompt only resolves after the SDK finishes the entire turn — which
  // would delay the command_result and cause a race where all SDK events arrive
  // before the frontend has set up the session tab (wiping the messages).
  void enqueuePrompt(session, command.prompt);
}

function handleSdkMessage(session: ClaudeSession, message: SDKMessage, capabilities: any[]) {
  if (message.type === "system" && message.subtype === "init") {
    emit({
      type: "session_init",
      sessionId: session.sessionId,
      claudeSessionId: (message as any).session_id,
      model: (message as any).model,
      permissionMode: (message as any).permissionMode,
      tools: Array.isArray((message as any).tools) ? (message as any).tools : undefined,
      slashCommands: Array.isArray(capabilities)
        ? capabilities.map((command: any) => ({
            name: String(command.name ?? ""),
            description: String(command.description ?? ""),
            category: "builtin",
            ...(command.source ? { source: String(command.source) } : {}),
          }))
        : undefined,
    });
    emit({
      type: "session_meta",
      sessionId: session.sessionId,
      agent: session.agent,
      effort: session.effort,
      claudePath: session.claudePath,
      slashCommands: Array.isArray(capabilities)
        ? capabilities.map((command: any) => ({
            name: String(command.name ?? ""),
            description: String(command.description ?? ""),
            category: "builtin",
            ...(command.source ? { source: String(command.source) } : {}),
          }))
        : undefined,
    });
    return;
  }

  if (message.type === "assistant") {
    const messageId = String((message as any).message?.id ?? session.activeAssistantId ?? "");
    const text = contentText((message as any).message?.content);
    emit({
      type: "assistant_complete",
      sessionId: session.sessionId,
      messageId,
      ...(text ? { content: text } : {}),
    });
    return;
  }

  if (message.type === "user") {
    const toolUseId =
      typeof (message as any).parent_tool_use_id === "string"
        ? (message as any).parent_tool_use_id
        : undefined;

    if (!toolUseId) {
      return;
    }

    const toolResult =
      stringifyToolResult((message as any).tool_use_result) ??
      contentText((message as any).message?.content);

    emit({
      type: "tool_complete",
      sessionId: session.sessionId,
      toolUseId,
      ...(toolResult ? { content: toolResult } : {}),
      isError: false,
    });
    return;
  }

  if (message.type === "result") {
    emit({
      type: "result",
      sessionId: session.sessionId,
      resultText: String((message as any).result ?? ""),
      durationMs: (message as any).duration_ms,
      totalCostUsd: (message as any).total_cost_usd,
      isError: Boolean((message as any).is_error),
    });
    return;
  }

  if (message.type === "tool_progress") {
    emit({
      type: "tool_progress",
      sessionId: session.sessionId,
      toolUseId: (message as any).tool_use_id,
      toolName: (message as any).tool_name,
      status:
        typeof (message as any).elapsed_time_seconds === "number"
          ? `${String((message as any).tool_name ?? "tool")} running (${Math.round((message as any).elapsed_time_seconds)}s)`
          : `${String((message as any).tool_name ?? "tool")} running`,
    });
    return;
  }

  if (message.type !== "stream_event") {
    return;
  }

  const event = (message as any).event;
  if (!event || typeof event !== "object") return;

  if (event.type === "message_start") {
    const messageId = String(event.message?.id ?? "");
    session.activeAssistantId = messageId;
    emit({ type: "assistant_start", sessionId: session.sessionId, messageId });
    return;
  }

  if (event.type === "content_block_start") {
    const block = event.content_block;
    const blockType = block?.type;
    if (blockType === "thinking") {
      const messageId = session.activeAssistantId ?? `thinking-${Date.now()}`;
      session.activeThinkingId = messageId;
      emit({ type: "thinking_start", sessionId: session.sessionId, messageId });
      return;
    }
    if (blockType === "tool_use") {
      const toolUseId = String(block?.id ?? `tool-${Date.now()}`);
      session.activeToolUseId = toolUseId;
      session.toolInputBuffers.set(toolUseId, "");
      emit({
        type: "tool_start",
        sessionId: session.sessionId,
        toolUseId,
        toolName: String(block?.name ?? "tool"),
        input: asRecord(block?.input),
      });
    }
    return;
  }

  if (event.type === "content_block_delta") {
    const delta = event.delta;
    const deltaType = delta?.type;
    if (deltaType === "text_delta" && typeof delta.text === "string" && session.activeAssistantId) {
      emit({
        type: "assistant_delta",
        sessionId: session.sessionId,
        messageId: session.activeAssistantId,
        content: delta.text,
      });
      return;
    }
    if (deltaType === "thinking_delta" && typeof delta.thinking === "string") {
      emit({
        type: "thinking_delta",
        sessionId: session.sessionId,
        messageId: session.activeThinkingId ?? session.activeAssistantId ?? `thinking-${Date.now()}`,
        content: delta.thinking,
      });
      return;
    }
    if (deltaType === "input_json_delta" && typeof delta.partial_json === "string" && session.activeToolUseId) {
      emit({
        type: "tool_input_delta",
        sessionId: session.sessionId,
        toolUseId: session.activeToolUseId,
        inputDelta: delta.partial_json,
      });
    }
    return;
  }

  if (event.type === "content_block_stop") {
    const block = event.content_block;
    if (block?.type === "thinking") {
      emit({
        type: "thinking_complete",
        sessionId: session.sessionId,
        messageId: session.activeThinkingId ?? session.activeAssistantId ?? `thinking-${Date.now()}`,
      });
      session.activeThinkingId = undefined;
      return;
    }
    if (block?.type === "tool_use" && session.activeToolUseId) {
      session.activeToolUseId = undefined;
    }
  }
}

async function handleCommand(command: HostCommand) {
  switch (command.type) {
    case "get_capabilities": {
      const capabilities = await createCapabilitiesQuery(command.claudePath ?? undefined);
      emitResult(command.requestId, {
        slashCommands: capabilities.commands,
        initialization: capabilities.init ?? null,
      });
      break;
    }
    case "start_session":
      await startSession(command);
      emitResult(command.requestId);
      break;
    case "send_user_message": {
      const session = sessions.get(command.sessionId);
      if (!session) throw new Error(`Session '${command.sessionId}' not found`);
      // Fire-and-forget: don't block on SDK turn completion (see startSession comment)
      void enqueuePrompt(session, command.prompt, command.images);
      emitResult(command.requestId);
      break;
    }
    case "respond_approval": {
      const session = sessions.get(command.sessionId);
      if (!session) throw new Error(`Session '${command.sessionId}' not found`);
      const pending = session.pendingApprovals.get(command.approvalId);
      if (!pending) throw new Error(`Approval '${command.approvalId}' not found`);
      session.pendingApprovals.delete(command.approvalId);
      pending.resolve(
        command.allow
          ? { behavior: "allow", updatedInput: pending.toolInput }
          : { behavior: "deny", message: "User denied tool execution." },
      );
      emit({
        type: "approval_resolved",
        sessionId: command.sessionId,
        approvalId: command.approvalId,
        allow: command.allow,
      });
      emitResult(command.requestId);
      break;
    }
    case "update_permission_mode": {
      const session = sessions.get(command.sessionId);
      if (!session) throw new Error(`Session '${command.sessionId}' not found`);
      session.permissionMode = command.permissionMode;
      session.underlyingPermissionMode = command.permissionMode;
      const sdkMode = toSdkPermissionMode(command.permissionMode);
      if (sdkMode && typeof session.queryRuntime?.setPermissionMode === "function") {
        await session.queryRuntime.setPermissionMode(sdkMode);
      }
      emitResult(command.requestId);
      break;
    }
    case "interrupt_turn": {
      const session = sessions.get(command.sessionId);
      if (!session) throw new Error(`Session '${command.sessionId}' not found`);
      await session.queryRuntime?.interrupt?.();
      emitResult(command.requestId);
      break;
    }
    case "end_session": {
      const session = sessions.get(command.sessionId);
      if (!session) {
        emitResult(command.requestId);
        break;
      }
      session.closed = true;
      session.nextPrompt?.();
      try {
        session.queryRuntime?.close?.();
      } catch {
        // ignore
      }
      sessions.delete(command.sessionId);
      emitResult(command.requestId);
      break;
    }
  }
}

const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) return;
  let parsed: HostCommand;
  try {
    parsed = JSON.parse(line) as HostCommand;
  } catch (error) {
    emit({
      type: "runtime_error",
      sessionId: "host",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  void handleCommand(parsed).catch((error) => {
    emitError(parsed.requestId, error);
  });
});

process.stdin.resume();
await once(rl, "close");
