import Anthropic from "@anthropic-ai/sdk";
import { chalkStderr } from "chalk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  formatCancelled,
  formatError,
  formatJson,
  formatTruncated,
  formatUsage,
  formatUsageHint,
} from "./format.js";

const USAGE = {
  input_tokens: 12,
  output_tokens: 85,
  cache_creation_input_tokens: null,
  cache_read_input_tokens: 3,
};

describe("format", () => {
  const originalLevel = chalkStderr.level;

  afterEach(() => {
    chalkStderr.level = originalLevel;
  });

  describe("without colors", () => {
    beforeEach(() => {
      chalkStderr.level = 0;
    });

    it("formats token usage and cost", () => {
      expect(formatUsage(USAGE, 0.000044)).toBe(
        "---\n" +
          "Tokens: 12 in / 85 out (cache write 0, cache read 3)\n" +
          "Approx. cost: $0.000044",
      );
    });

    it("describes connection failures without a bogus status", () => {
      expect(formatError(new Anthropic.APIConnectionError({}))).toContain(
        "Could not reach the API",
      );
      expect(formatError(new Anthropic.APIConnectionTimeoutError())).toContain(
        "timed out",
      );
    });

    it("warns about truncated answers", () => {
      expect(formatTruncated(1024)).toContain("(1024 tokens)");
      expect(formatTruncated()).toContain("--max-tokens");
    });

    it("reports an unknown cost", () => {
      expect(formatUsage(USAGE, null)).toContain(
        "Approx. cost: unknown (no pricing for this model)",
      );
    });

    it("describes API authentication errors", () => {
      const error = new Anthropic.AuthenticationError(
        401,
        undefined,
        "unauthorized",
        new Headers(),
      );

      expect(formatError(error)).toBe(
        "Error: Invalid or missing API key (set ANTHROPIC_API_KEY)",
      );
    });

    it("describes plain errors and non-error values", () => {
      expect(formatError(new Error("boom"))).toBe("Error: boom");
      expect(formatError("oops")).toBe("Error: oops");
    });

    it("shows how to run the CLI", () => {
      expect(formatUsageHint()).toBe(
        'Usage: claude-ask [options] "your message"  (see --help)',
      );
    });

    it("formats the cancelled message", () => {
      expect(formatCancelled()).toBe("Cancelled");
    });
  });

  describe("with colors", () => {
    beforeEach(() => {
      chalkStderr.level = 1;
    });

    it("colors the cost green", () => {
      expect(formatUsage(USAGE, 0.5)).toContain(chalkStderr.green("$0.500000"));
    });

    it("colors errors red", () => {
      expect(formatError(new Error("boom"))).toContain(chalkStderr.red("boom"));
    });
  });

  describe("formatJson", () => {
    it("prints the result as plain, parseable JSON even with colors on", () => {
      chalkStderr.level = 1;
      const result = {
        model: "m",
        text: "Hello",
        usage: USAGE,
        stopReason: "end_turn",
        cost: 0.1,
      };

      const output = formatJson(result);

      expect(output).not.toContain("\u001b");
      expect(JSON.parse(output)).toEqual(result);
    });
  });
});
