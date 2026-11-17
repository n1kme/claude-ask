import Anthropic from "@anthropic-ai/sdk";
import { chalkStderr as c } from "chalk";
import type { AskResult, TokenUsage } from "../services/types.js";

// Everything formatted here is written to stderr, so it is coloured based on
// stderr's capabilities. stdout carries only the answer (or JSON).

export function formatUsage(usage: TokenUsage, cost: number | null): string {
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const counts = `${c.cyan(usage.input_tokens)} in / ${c.magenta(usage.output_tokens)} out`;
  const cache = c.gray(`(cache write ${cacheWrite}, cache read ${cacheRead})`);
  const tokens = `${c.bold("Tokens:")} ${counts} ${cache}`;
  const price =
    cost === null
      ? `${c.bold("Approx. cost:")} ${c.yellow("unknown (no pricing for this model)")}`
      : `${c.bold("Approx. cost:")} ${c.green(`$${cost.toFixed(6)}`)}`;
  return `${c.dim("---")}\n${tokens}\n${price}`;
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Invalid or missing API key (set ANTHROPIC_API_KEY)";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Rate limited - retry later";
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return "The request timed out - check your connection and retry";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return `Could not reach the API: ${error.message}`;
  }
  if (error instanceof Anthropic.APIError) {
    return `API error ${error.status}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export function formatError(error: unknown): string {
  return `${c.red.bold("Error:")} ${c.red(describeError(error))}`;
}

export function formatTruncated(maxTokens?: number): string {
  const limit = maxTokens ? ` (${maxTokens} tokens)` : "";
  return c.yellow(
    `Warning: the answer was cut off at the token limit${limit}. Raise it with --max-tokens.`,
  );
}

export function formatCancelled(): string {
  return c.dim("Cancelled");
}

export function formatUsageHint(): string {
  return `${c.yellow("Usage:")} claude-ask [options] ${c.cyan('"your message"')}  ${c.gray("(see --help)")}`;
}

// Plain JSON with no colours, so it is safe to pipe into other tools.
export function formatJson(result: AskResult): string {
  return JSON.stringify(result, null, 2);
}
