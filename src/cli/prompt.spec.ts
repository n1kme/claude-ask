import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt.js";

describe("buildPrompt", () => {
  it("returns null when there is no prompt and no stdin", () => {
    expect(buildPrompt("", null)).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(buildPrompt("  ", "\n\n")).toBeNull();
  });

  it("returns the argument prompt when nothing is piped", () => {
    expect(buildPrompt("hello", null)).toBe("hello");
  });

  it("ignores empty piped input", () => {
    expect(buildPrompt("hello", "\n")).toBe("hello");
  });

  it("returns piped content alone when there is no argument prompt", () => {
    expect(buildPrompt("", "some text\n")).toBe("some text");
  });

  it("wraps piped content in stdin tags after the instruction", () => {
    expect(buildPrompt("review this", "diff --git\n")).toBe(
      "review this\n\n<stdin>\ndiff --git\n</stdin>",
    );
  });

  it("keeps the piped content's inner whitespace", () => {
    expect(buildPrompt("x", "a\n\n  b")).toBe(
      "x\n\n<stdin>\na\n\n  b\n</stdin>",
    );
  });
});
