import { describe, expect, it } from "vitest";
import type { PricingTable } from "../constants/types.js";
import { estimateCost } from "./cost.js";
import type { TokenUsage } from "./types.js";

function usage(overrides: Partial<TokenUsage> = {}): TokenUsage {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: null,
    cache_read_input_tokens: null,
    ...overrides,
  };
}

const pricing: PricingTable = {
  "test-model": {
    input: 1,
    output: 10,
    longContext: { input: 2, output: 20 },
    longContextThreshold: 1_000,
  },
  "flat-model": { input: 1, output: 10 },
};

describe("estimateCost", () => {
  it("prices dated snapshot IDs at the base model's rate", () => {
    expect(
      estimateCost(
        "flat-model-20260101",
        usage({ input_tokens: 1_000_000 }),
        pricing,
      ),
    ).toBe(1);
  });

  it("returns null for a model without pricing", () => {
    expect(estimateCost("unknown", usage({ input_tokens: 10 }), pricing)).toBe(
      null,
    );
  });

  it("charges input and output at the standard rates", () => {
    const cost = estimateCost(
      "test-model",
      usage({ input_tokens: 500, output_tokens: 100 }),
      pricing,
    );

    // 500 * $1 + 100 * $10, per 1M tokens
    expect(cost).toBeCloseTo(1_500 / 1_000_000);
  });

  it("applies cache write and read multipliers", () => {
    const cost = estimateCost(
      "test-model",
      usage({ cache_creation_input_tokens: 400, cache_read_input_tokens: 500 }),
      pricing,
    );

    // 400 * 1.25 + 500 * 0.1 input tokens at $1
    expect(cost).toBeCloseTo(550 / 1_000_000);
  });

  it("switches to long-context rates above the threshold", () => {
    const cost = estimateCost(
      "test-model",
      usage({ input_tokens: 1_001, output_tokens: 10 }),
      pricing,
    );

    expect(cost).toBeCloseTo((1_001 * 2 + 10 * 20) / 1_000_000);
  });

  it("counts cached tokens toward the long-context threshold", () => {
    const cost = estimateCost(
      "test-model",
      usage({ input_tokens: 1, cache_read_input_tokens: 1_000 }),
      pricing,
    );

    expect(cost).toBeCloseTo(((1 + 1_000 * 0.1) * 2) / 1_000_000);
  });

  it("keeps standard rates for models without long-context pricing", () => {
    const cost = estimateCost(
      "flat-model",
      usage({ input_tokens: 5_000 }),
      pricing,
    );

    expect(cost).toBeCloseTo(5_000 / 1_000_000);
  });

  it("uses the built-in pricing table by default", () => {
    expect(
      estimateCost("claude-haiku-5-5", usage({ output_tokens: 1_000_000 })),
    ).toBeCloseTo(0.5);
  });
});
