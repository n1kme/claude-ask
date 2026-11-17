import Anthropic from "@anthropic-ai/sdk";
import { EXIT_CODES } from "../constants/exit-codes.js";
import type { AskResult } from "../services/types.js";
import { UsageError, parseCliArgs } from "./args.js";
import {
  formatCancelled,
  formatError,
  formatJson,
  formatTruncated,
  formatUsage,
  formatUsageHint,
} from "./format.js";
import { formatHelp } from "./help.js";
import { buildPrompt } from "./prompt.js";
import type { CliArgs, CliDeps } from "./types.js";

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return (
    signal?.aborted === true ||
    error instanceof Anthropic.APIUserAbortError ||
    (error instanceof Error && error.name === "AbortError")
  );
}

// Runs the CLI and returns its exit code. Dependencies are injected so the
// flow can be tested without the network or a real terminal.
export async function run(argv: string[], deps: CliDeps): Promise<number> {
  const { output, spinner, signal } = deps;

  let args: CliArgs;
  try {
    args = parseCliArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    output.error(formatError(error));
    output.error(formatUsageHint());
    return EXIT_CODES.error;
  }

  if (args.help) {
    output.log(formatHelp());
    return EXIT_CODES.ok;
  }
  if (args.version) {
    output.log(deps.version);
    return EXIT_CODES.ok;
  }

  // True once any answer text has been written to stdout.
  let streamed = false;

  try {
    const prompt = buildPrompt(
      args.prompt,
      args.useStdin ? await deps.readStdin(signal) : null,
    );
    if (signal?.aborted) throw new Error("Interrupted");
    if (!prompt) {
      output.error(formatUsageHint());
      return EXIT_CODES.error;
    }

    const service = deps.createService({
      model: args.model,
      maxTokens: args.maxTokens,
    });

    let result: AskResult;
    if (args.json) {
      result = await service.askWithUsage(prompt, {
        signal,
        system: args.system,
      });
      output.log(formatJson(result));
      if (result.stopReason === "max_tokens") {
        output.error(formatTruncated(args.maxTokens));
      }
    } else {
      spinner.start();
      result = await service.streamWithUsage(prompt, {
        signal,
        system: args.system,
        onText: (textDelta) => {
          spinner.stop();
          streamed = true;
          output.write(textDelta);
        },
      });
      spinner.stop();
      if (streamed) output.write("\n");
      if (result.stopReason === "max_tokens") {
        output.error(formatTruncated(args.maxTokens));
      }
      if (args.showUsage) {
        output.error(`\n${formatUsage(result.usage, result.cost)}`);
      }
    }
    return EXIT_CODES.ok;
  } catch (error) {
    spinner.stop();
    if (streamed) output.write("\n");
    if (isAbort(error, signal)) {
      output.error(formatCancelled());
      return EXIT_CODES.interrupted;
    }
    output.error(formatError(error));
    return EXIT_CODES.error;
  }
}
