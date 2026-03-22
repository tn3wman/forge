import type { AgentStreamEvent, CliType } from '../types/agentCli';

/**
 * Parse a raw JSON line from a CLI agent's stdout into a normalized AgentStreamEvent.
 * Returns null if the line cannot be parsed.
 */
export function parseAgentLine(line: string, cliType: CliType): AgentStreamEvent | null {
  try {
    const raw = JSON.parse(line);
    switch (cliType) {
      case 'claude_code':
        return parseClaudeCodeEvent(raw);
      case 'codex':
        return parseCodexEvent(raw);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Parse Claude Code's stream-json format into normalized events.
 * Claude Code emits: assistant, content_block_delta, tool_use,
 * tool_result, result, error
 */
function parseClaudeCodeEvent(raw: Record<string, unknown>): AgentStreamEvent | null {
  const type = raw.type as string;

  switch (type) {
    case 'assistant': {
      const message = raw.message as Record<string, unknown> | undefined;
      return {
        type: 'assistant',
        message: {
          text: (message?.text as string) ?? '',
          model: message?.model as string | undefined,
        },
      };
    }

    case 'content_block_delta': {
      const delta = raw.delta as Record<string, unknown> | undefined;
      if (delta?.type === 'text_delta') {
        return {
          type: 'assistant',
          message: { text: delta.text as string },
        };
      }
      // Tool call deltas (input_json_delta) are handled at content_block_start/stop level
      return null;
    }

    case 'tool_use': {
      return {
        type: 'tool_use',
        name: raw.name as string,
        id: raw.id as string,
        input: (raw.input as Record<string, unknown>) ?? {},
      };
    }

    case 'tool_result': {
      return {
        type: 'tool_result',
        id: (raw.id as string) ?? (raw.tool_use_id as string) ?? '',
        output: (raw.output as string) ?? (raw.content as string) ?? '',
        isError: (raw.is_error as boolean) ?? false,
      };
    }

    case 'result': {
      return {
        type: 'result',
        text: (raw.result as string) ?? (raw.text as string) ?? '',
        cost: raw.cost_usd as number | undefined,
        duration: raw.duration_ms as number | undefined,
      };
    }

    case 'error': {
      const error = raw.error as Record<string, unknown> | undefined;
      return {
        type: 'error',
        error: (error?.message as string) ?? (raw.message as string) ?? 'Unknown error',
      };
    }

    default:
      return null;
  }
}

/**
 * Parse Codex CLI's JSON output format (provisional).
 * The exact format may change as the Codex CLI stabilizes.
 */
function parseCodexEvent(raw: Record<string, unknown>): AgentStreamEvent | null {
  const type = raw.type as string;

  switch (type) {
    case 'message':
      return {
        type: 'assistant',
        message: {
          text: (raw.content as string) ?? (raw.text as string) ?? '',
          model: raw.model as string | undefined,
        },
      };

    case 'function_call':
    case 'tool_call':
      return {
        type: 'tool_use',
        name: (raw.name as string) ?? '',
        id: (raw.id as string) ?? '',
        input: (raw.arguments as Record<string, unknown>) ?? {},
      };

    case 'function_result':
    case 'tool_result':
      return {
        type: 'tool_result',
        id: (raw.call_id as string) ?? (raw.id as string) ?? '',
        output: (raw.output as string) ?? '',
        isError: (raw.is_error as boolean) ?? false,
      };

    case 'done':
    case 'result':
      return {
        type: 'result',
        text: (raw.summary as string) ?? '',
        cost: raw.cost as number | undefined,
        duration: raw.duration_ms as number | undefined,
      };

    case 'error':
      return {
        type: 'error',
        error: (raw.message as string) ?? 'Unknown Codex error',
      };

    default:
      return null;
  }
}
