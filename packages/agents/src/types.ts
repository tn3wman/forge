export interface ModelAdapter {
  readonly provider: string;
  readonly modelName: string;

  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  stream(prompt: string, options?: GenerateOptions): AsyncIterable<string>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

export interface GenerateResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: 'stop' | 'max_tokens' | 'tool_use';
}
