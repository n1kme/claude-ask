import type { ConfigOverrides } from "../config/index.js";
import type { ClaudeService } from "../services/types.js";

export interface Output {
  // Writes a line to stdout.
  log(text: string): void;
  // Writes a line to stderr.
  error(text: string): void;
  // Writes text to stdout without a trailing newline (for streaming).
  write(text: string): void;
}

export interface Spinner {
  start(): void;
  // Safe to call when the spinner isn't running.
  stop(): void;
}

export interface CliArgs {
  // Positional arguments joined into one prompt (may be empty).
  prompt: string;
  model?: string;
  maxTokens?: number;
  // Sent as the system prompt; omitted when not given.
  system?: string;
  showUsage: boolean;
  // False with --no-stdin: never read piped input.
  useStdin: boolean;
  json: boolean;
  help: boolean;
  version: boolean;
}

export interface CliDeps {
  // Builds a service from the environment plus per-run overrides.
  createService(overrides: ConfigOverrides): ClaudeService;
  // Returns piped stdin, or null when stdin is an interactive terminal.
  readStdin(signal?: AbortSignal): Promise<string | null>;
  spinner: Spinner;
  output: Output;
  // Aborted when the user interrupts (Ctrl+C).
  signal?: AbortSignal;
  version: string;
}
