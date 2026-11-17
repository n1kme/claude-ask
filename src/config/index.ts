import { DEFAULTS } from "../constants/defaults.js";
import { parsePositiveInt } from "./parse.js";
import type { AppConfig, ConfigOverrides, Env } from "./types.js";

export { requireApiKey } from "./api-key.js";
export { loadEnv } from "./env.js";
export { parsePositiveInt } from "./parse.js";
export type { AppConfig, ConfigOverrides, Env } from "./types.js";

// Builds the app config. Precedence: overrides > environment > defaults.
// Invalid values throw immediately rather than failing later in an API call.
export function loadConfig(
  env: Env = process.env,
  overrides: ConfigOverrides = {},
): AppConfig {
  return Object.freeze({
    model: overrides.model || env.CLAUDE_MODEL || DEFAULTS.model,
    maxTokens:
      overrides.maxTokens ??
      (env.CLAUDE_MAX_TOKENS
        ? parsePositiveInt("CLAUDE_MAX_TOKENS", env.CLAUDE_MAX_TOKENS)
        : DEFAULTS.maxTokens),
  });
}
