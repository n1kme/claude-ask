import type { Env } from "./types.js";

// This app talks to the Claude API with an API key only. Login sessions
// (`ant auth login` profiles) and ANTHROPIC_AUTH_TOKEN are deliberately not
// used, so a missing key is an error rather than a silent fallback.
export function requireApiKey(env: Env = process.env): string {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. This app uses the Claude API with an API key only " +
        "(login sessions are not used). Add it to .env or export it in your shell.",
    );
  }
  return apiKey;
}
