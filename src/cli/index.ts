#!/usr/bin/env node
import { createRequire } from "node:module";
import { EXIT_CODES } from "../constants/exit-codes.js";
import { createDefaultService, loadConfig, loadEnv } from "../index.js";
import { formatError } from "./format.js";
import { run } from "./run.js";
import { createSpinner } from "./spinner.js";
import { readStdin } from "./stdin.js";

// The entry file sits two levels below the project root both in src/ and in
// dist/, so this path is valid for the source and the built CLI.
const { version } = createRequire(import.meta.url)("../../package.json") as {
  version: string;
};

try {
  loadEnv();
  process.exitCode = await main();
} catch (error) {
  console.error(formatError(error));
  process.exitCode = EXIT_CODES.error;
}

async function main(): Promise<number> {
  const controller = new AbortController();
  process.once("SIGINT", () => {
    controller.abort();
    // A second Ctrl+C while shutting down exits immediately.
    process.once("SIGINT", () => process.exit(EXIT_CODES.interrupted));
  });

  return await run(process.argv.slice(2), {
    createService: (overrides) =>
      createDefaultService(loadConfig(process.env, overrides)),
    readStdin: (signal) => readStdin(process.stdin, { signal }),
    spinner: createSpinner("Thinking..."),
    output: {
      log: console.log,
      error: console.error,
      write: (text) => process.stdout.write(text),
    },
    signal: controller.signal,
    version,
  });
}
