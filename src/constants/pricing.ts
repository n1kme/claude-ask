import type { PricingTable } from "./types.js";

// Anthropic first-party API rates, USD per 1M tokens.
export const PRICING: PricingTable = Object.freeze({
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    longContext: { input: 0.5, output: 2.5 },
    longContextThreshold: 100_000,
  },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
});

// Prompt-cache multipliers relative to the input rate.
export const CACHE_MULTIPLIERS = Object.freeze({
  write: 1.25,
  read: 0.1,
});

export const TOKENS_PER_PRICE_UNIT = 1_000_000;
