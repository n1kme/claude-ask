import {
  CACHE_MULTIPLIERS,
  PRICING,
  TOKENS_PER_PRICE_UNIT,
} from "../constants/pricing.js";
import type { PricingTable } from "../constants/types.js";
import type { TokenUsage } from "./types.js";

// Returns the approximate USD cost of a response's usage, or null when the
// model has no known pricing.
export function estimateCost(
  model: string,
  usage: TokenUsage,
  pricing: PricingTable = PRICING,
): number | null {
  // Dated snapshot IDs (e.g. "claude-sonnet-5-5-20260101") use the base rate.
  const modelPricing = pricing[model] ?? pricing[model.replace(/-\d{8}$/, "")];
  if (!modelPricing) return null;

  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const promptTokens = usage.input_tokens + cacheWrite + cacheRead;
  const { longContext, longContextThreshold } = modelPricing;
  const rates =
    longContext &&
    longContextThreshold !== undefined &&
    promptTokens > longContextThreshold
      ? longContext
      : modelPricing;

  const billedInputTokens =
    usage.input_tokens +
    cacheWrite * CACHE_MULTIPLIERS.write +
    cacheRead * CACHE_MULTIPLIERS.read;

  return (
    (billedInputTokens * rates.input + usage.output_tokens * rates.output) /
    TOKENS_PER_PRICE_UNIT
  );
}
