import { readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Only these variables are taken from a .env file. A .env in the working
// directory may come from an untrusted checkout, so it must not be able to set
// things like ANTHROPIC_BASE_URL and redirect the API key elsewhere.
export const ENV_FILE_KEYS = Object.freeze([
  "ANTHROPIC_API_KEY",
  "CLAUDE_MODEL",
  "CLAUDE_MAX_TOKENS",
]);

// Loads the allowed variables from a .env file (default: .env in the current
// working directory) into `target` without overriding ones already set. A
// missing file is fine: the key may come from the shell.
export function loadEnv(
  envPath = path.join(process.cwd(), ".env"),
  target: NodeJS.ProcessEnv = process.env,
): void {
  let parsed: Record<string, string>;
  try {
    parsed = dotenv.parse(readFileSync(envPath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const key of ENV_FILE_KEYS) {
    if (target[key] === undefined && parsed[key] !== undefined) {
      target[key] = parsed[key];
    }
  }
}
