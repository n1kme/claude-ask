import type Anthropic from "@anthropic-ai/sdk";

export type TokenUsage = Pick<
  Anthropic.Usage,
  | "input_tokens"
  | "output_tokens"
  | "cache_creation_input_tokens"
  | "cache_read_input_tokens"
>;

export interface RequestOptions {
  // Aborts the in-flight request when signalled.
  signal?: AbortSignal;
  // Sets Claude's behaviour and context for this request.
  system?: string;
}

// The slice of a streaming response the service depends on.
export interface MessageStreamLike {
  on(
    event: "text",
    listener: (textDelta: string, textSnapshot: string) => void,
  ): unknown;
  finalMessage(): Promise<Anthropic.Message>;
}

// The slice of the Anthropic client the service depends on, so any
// compatible implementation (such as a test fake) can be injected.
export interface MessagesClient {
  messages: {
    create(
      params: Anthropic.MessageCreateParamsNonStreaming,
      options?: RequestOptions,
    ): Promise<Anthropic.Message>;
    stream(
      params: Anthropic.MessageStreamParams,
      options?: RequestOptions,
    ): MessageStreamLike;
  };
}

export interface ClaudeServiceOptions {
  client: MessagesClient;
  model: string;
  maxTokens: number;
}

export interface AskResult {
  model: string;
  text: string;
  usage: TokenUsage;
  // Why generation stopped, e.g. "end_turn" or "max_tokens" (truncated).
  stopReason: string | null;
  // Approximate USD cost, or null when the model has no known pricing.
  cost: number | null;
}

export interface StreamOptions extends RequestOptions {
  // Called with each piece of text as it arrives.
  onText?: (textDelta: string) => void;
}

export interface ClaudeService {
  ask(message: string): Promise<string>;
  askWithUsage(message: string, options?: RequestOptions): Promise<AskResult>;
  streamWithUsage(message: string, options?: StreamOptions): Promise<AskResult>;
}
