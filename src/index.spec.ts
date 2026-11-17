import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultService } from "./index.js";

const CONFIG = { model: "claude-haiku-5-5", maxTokens: 16 };

describe("createDefaultService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a service when an API key is set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");

    expect(createDefaultService(CONFIG)).toHaveProperty("streamWithUsage");
  });

  it("refuses to start without an API key", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    expect(() => createDefaultService(CONFIG)).toThrow(
      "ANTHROPIC_API_KEY is not set",
    );
  });

  it("does not fall back to an auth token or a login profile", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "some-token");
    vi.stubEnv("ANTHROPIC_PROFILE", "default");

    expect(() => createDefaultService(CONFIG)).toThrow(
      "ANTHROPIC_API_KEY is not set",
    );
  });
});
