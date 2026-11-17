import type Anthropic from "@anthropic-ai/sdk";
import { estimateCost } from "./cost.js";
import type {
  AskResult,
  ClaudeService,
  ClaudeServiceOptions,
  RequestOptions,
  StreamOptions,
} from "./types.js";

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

// Creates a service for single-turn questions to Claude. The client is
// injected so callers (and tests) can supply any compatible implementation.
export function createClaudeService({
  client,
  model,
  maxTokens,
}: ClaudeServiceOptions): ClaudeService {
  function buildParams(message: string, system?: string) {
    return {
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user" as const, content: message }],
      ...(system && { system }),
    };
  }

  function toResult(response: Anthropic.Message): AskResult {
    if (response.stop_reason === "refusal") {
      throw new Error(
        `Request declined: ${response.stop_details?.explanation ?? "no details"}`,
      );
    }

    return {
      model,
      text: extractText(response.content),
      usage: response.usage,
      stopReason: response.stop_reason,
      cost: estimateCost(model, response.usage),
    };
  }

  async function askWithUsage(
    message: string,
    { signal, system }: RequestOptions = {},
  ): Promise<AskResult> {
    const response = await client.messages.create(
      buildParams(message, system),
      { signal },
    );
    return toResult(response);
  }

  async function streamWithUsage(
    message: string,
    { onText, signal, system }: StreamOptions = {},
  ): Promise<AskResult> {
    const stream = client.messages.stream(buildParams(message, system), {
      signal,
    });
    if (onText) {
      stream.on("text", (textDelta) => onText(textDelta));
    }
    return toResult(await stream.finalMessage());
  }

  async function ask(message: string): Promise<string> {
    return (await askWithUsage(message)).text;
  }

  return { ask, askWithUsage, streamWithUsage };
}
