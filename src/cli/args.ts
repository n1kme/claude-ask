import { parseArgs } from "node:util";
import { parsePositiveInt } from "../config/index.js";
import type { CliArgs } from "./types.js";

// Raised for mistakes in how the CLI was invoked (bad flags, bad input).
export class UsageError extends Error {
  override name = "UsageError";
}

// `no-usage` is declared literally: parseArgs only supports automatic `--no-`
// negation from Node 22.4, and we support older versions.
const OPTIONS = {
  model: { type: "string", short: "m" },
  "max-tokens": { type: "string" },
  system: { type: "string" },
  "no-usage": { type: "boolean" },
  "no-stdin": { type: "boolean" },
  json: { type: "boolean" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const;

export function parseCliArgs(argv: string[]): CliArgs {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    const maxTokens = values["max-tokens"];

    return {
      prompt: positionals.join(" ").trim(),
      model: values.model,
      maxTokens:
        maxTokens === undefined
          ? undefined
          : parsePositiveInt("--max-tokens", maxTokens),
      system: values.system,
      showUsage: !values["no-usage"],
      useStdin: !values["no-stdin"],
      json: values.json ?? false,
      help: values.help ?? false,
      version: values.version ?? false,
    };
  } catch (error) {
    throw new UsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
