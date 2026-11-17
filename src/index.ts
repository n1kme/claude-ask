import Anthropic from "@anthropic-ai/sdk";
import {
  type AppConfig,
  loadConfig,
  loadEnv,
  requireApiKey,
} from "./config/index.js";
import { createClaudeService } from "./services/claude.js";
import type { AskResult, ClaudeService } from "./services/types.js";

export { createClaudeService } from "./services/claude.js";
export { estimateCost } from "./services/cost.js";
export { loadConfig, loadEnv } from "./config/index.js";
export type { AppConfig, ConfigOverrides } from "./config/index.js";
export type * from "./services/types.js";

// Builds a service for the given config. Authenticates with ANTHROPIC_API_KEY
// only: passing the key explicitly stops the SDK from falling back to
// ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile. Throws if it is unset.
export function createDefaultService(config: AppConfig): ClaudeService {
  const client = new Anthropic({ apiKey: requireApiKey() });
  return createClaudeService({ client, ...config });
}

let defaultService: ClaudeService | undefined;

// Lazily wires the default service from .env and config.
function getDefaultService(): ClaudeService {
  if (!defaultService) {
    loadEnv();
    defaultService = createDefaultService(loadConfig());
  }
  return defaultService;
}

export function ask(message: string): Promise<string> {
  return getDefaultService().ask(message);
}

export function askWithUsage(message: string): Promise<AskResult> {
  return getDefaultService().askWithUsage(message);
}
