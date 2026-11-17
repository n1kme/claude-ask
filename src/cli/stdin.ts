import { type Readable, addAbortSignal } from "node:stream";
import { MAX_STDIN_BYTES } from "../constants/limits.js";
import { UsageError } from "./args.js";

interface ReadStdinOptions {
  signal?: AbortSignal;
  maxBytes?: number;
}

// Reads piped stdin to the end. Returns null when stdin is an interactive
// terminal (nothing was piped). Throws UsageError past `maxBytes` instead of
// truncating, and rejects with an AbortError if `signal` fires while reading.
export async function readStdin(
  stream: Readable & { isTTY?: boolean } = process.stdin,
  { signal, maxBytes = MAX_STDIN_BYTES }: ReadStdinOptions = {},
): Promise<string | null> {
  if (stream.isTTY) return null;

  const source = signal ? addAbortSignal(signal, stream) : stream;

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of source) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > maxBytes) {
      throw new UsageError(
        `Piped input is larger than ${maxBytes} bytes. Trim it or pass a smaller file.`,
      );
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
