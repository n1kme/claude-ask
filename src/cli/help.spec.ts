import chalk from "chalk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULTS } from "../constants/defaults.js";
import { formatHelp } from "./help.js";

describe("formatHelp", () => {
  const originalLevel = chalk.level;

  beforeEach(() => {
    chalk.level = 0;
  });

  afterEach(() => {
    chalk.level = originalLevel;
  });

  it("documents every flag", () => {
    const help = formatHelp();

    for (const flag of [
      "--model",
      "-m",
      "--max-tokens",
      "--no-usage",
      "--json",
      "--help",
      "--version",
    ]) {
      expect(help).toContain(flag);
    }
  });

  it("shows the defaults from the constants", () => {
    const help = formatHelp();

    expect(help).toContain(`default: ${DEFAULTS.model}`);
    expect(help).toContain(`default: ${DEFAULTS.maxTokens}`);
  });

  it("documents the environment variables and stdin usage", () => {
    const help = formatHelp();

    expect(help).toContain("ANTHROPIC_API_KEY");
    expect(help).toContain("CLAUDE_MODEL");
    expect(help).toContain("CLAUDE_MAX_TOKENS");
    expect(help).toContain("cat file | claude-ask");
  });
});
