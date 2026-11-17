import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../constants/defaults.js";
import { loadConfig, loadEnv } from "./index.js";

describe("loadConfig", () => {
  it("falls back to defaults when no variables are set", () => {
    expect(loadConfig({})).toEqual(DEFAULTS);
  });

  it("falls back to the default for an empty --model", () => {
    expect(loadConfig({}, { model: "" }).model).toBe(DEFAULTS.model);
  });

  it("reads overrides from the environment", () => {
    const config = loadConfig({
      CLAUDE_MODEL: "claude-opus-5-5",
      CLAUDE_MAX_TOKENS: "2048",
    });

    expect(config).toEqual({ model: "claude-opus-5-5", maxTokens: 2048 });
  });

  it.each(["abc", "0", "-5", "1.5", "1e3", "0x10", " 5 "])(
    "rejects an invalid CLAUDE_MAX_TOKENS of %p",
    (value) => {
      expect(() => loadConfig({ CLAUDE_MAX_TOKENS: value })).toThrow(
        `CLAUDE_MAX_TOKENS must be a positive integer, got "${value}"`,
      );
    },
  );

  it("lets overrides win over the environment", () => {
    const config = loadConfig(
      { CLAUDE_MODEL: "from-env", CLAUDE_MAX_TOKENS: "10" },
      { model: "from-flag", maxTokens: 20 },
    );

    expect(config).toEqual({ model: "from-flag", maxTokens: 20 });
  });

  it("ignores undefined overrides", () => {
    const config = loadConfig(
      { CLAUDE_MODEL: "from-env" },
      { model: undefined, maxTokens: undefined },
    );

    expect(config).toEqual({
      model: "from-env",
      maxTokens: DEFAULTS.maxTokens,
    });
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(loadConfig({}))).toBe(true);
  });
});

describe("loadEnv", () => {
  let dir: string;
  let envPath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "config-spec-"));
    envPath = path.join(dir, ".env");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("loads variables from the given file", () => {
    fs.writeFileSync(envPath, 'ANTHROPIC_API_KEY=k\nCLAUDE_MODEL="quoted"\n');
    const target: NodeJS.ProcessEnv = {};

    loadEnv(envPath, target);

    expect(target).toEqual({ ANTHROPIC_API_KEY: "k", CLAUDE_MODEL: "quoted" });
  });

  it("ignores variables outside the allowlist", () => {
    fs.writeFileSync(
      envPath,
      "ANTHROPIC_BASE_URL=https://evil.example\nANTHROPIC_API_KEY=k\n",
    );
    const target: NodeJS.ProcessEnv = {};

    loadEnv(envPath, target);

    expect(target).toEqual({ ANTHROPIC_API_KEY: "k" });
  });

  it("throws on an unreadable .env (e.g. a directory)", () => {
    fs.mkdirSync(envPath);

    expect(() => loadEnv(envPath, {})).toThrow();
  });

  it("does not override variables that are already set", () => {
    fs.writeFileSync(envPath, "CLAUDE_MODEL=from-file\n");
    const target: NodeJS.ProcessEnv = { CLAUDE_MODEL: "from-shell" };

    loadEnv(envPath, target);

    expect(target.CLAUDE_MODEL).toBe("from-shell");
  });

  it("reads .env from the current working directory by default", () => {
    fs.writeFileSync(envPath, "CLAUDE_MODEL=from-cwd\n");
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const target: NodeJS.ProcessEnv = {};

    loadEnv(undefined, target);

    expect(target).toEqual({ CLAUDE_MODEL: "from-cwd" });
  });

  it("ignores a missing file", () => {
    const target: NodeJS.ProcessEnv = {};

    expect(() => loadEnv(path.join(dir, "missing.env"), target)).not.toThrow();
    expect(target).toEqual({});
  });
});
