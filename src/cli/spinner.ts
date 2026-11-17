import ora from "ora";
import type { Spinner } from "./types.js";

export const noopSpinner: Spinner = { start() {}, stop() {} };

// A spinner on stderr, shown only when stderr is an interactive terminal, so
// redirected or piped output never contains spinner frames. A terminal that
// reports zero columns (some pseudo-terminals) is treated as non-interactive:
// ora divides by the width and would loop forever clearing lines.
export function createSpinner(
  text: string,
  stream: NodeJS.WriteStream = process.stderr,
): Spinner {
  if (!stream.isTTY || stream.columns === 0) return noopSpinner;

  const spinner = ora({ text, stream, discardStdin: false });
  // ora's stop() moves the cursor to column 1 even when it isn't spinning, so
  // a repeated stop() would make streamed text overwrite itself.
  let running = false;
  return {
    start() {
      running = true;
      spinner.start();
    },
    stop() {
      if (!running) return;
      running = false;
      spinner.stop();
    },
  };
}
