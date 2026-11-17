import { describe, expect, it } from "vitest";
import { requireApiKey } from "./api-key.js";

describe("requireApiKey", () => {
  it("returns the key from the environment", () => {
    expect(requireApiKey({ ANTHROPIC_API_KEY: "sk-ant-test" })).toBe(
      "sk-ant-test",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(requireApiKey({ ANTHROPIC_API_KEY: "  sk-ant-test\n" })).toBe(
      "sk-ant-test",
    );
  });

  it.each([undefined, "", "   "])("throws when the key is %p", (value) => {
    expect(() => requireApiKey({ ANTHROPIC_API_KEY: value })).toThrow(
      "ANTHROPIC_API_KEY is not set",
    );
  });

  it("does not fall back to an auth token", () => {
    expect(() =>
      requireApiKey({ ANTHROPIC_AUTH_TOKEN: "token", ANTHROPIC_PROFILE: "p" }),
    ).toThrow("ANTHROPIC_API_KEY is not set");
  });
});
