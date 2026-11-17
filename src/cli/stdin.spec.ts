import { PassThrough, Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { UsageError } from "./args.js";
import { readStdin } from "./stdin.js";

function ttyStream() {
  return Object.assign(Readable.from([]), { isTTY: true });
}

describe("readStdin", () => {
  it("returns null for an interactive terminal", async () => {
    await expect(readStdin(ttyStream())).resolves.toBeNull();
  });

  it("reads all piped chunks", async () => {
    const stream = Readable.from([Buffer.from("hello "), Buffer.from("world")]);

    await expect(readStdin(stream)).resolves.toBe("hello world");
  });

  it("handles string chunks and multi-byte characters", async () => {
    const stream = Readable.from(["héllo ", "wörld ✓"]);

    await expect(readStdin(stream)).resolves.toBe("héllo wörld ✓");
  });

  it("returns an empty string for an empty pipe", async () => {
    await expect(readStdin(Readable.from([]))).resolves.toBe("");
  });

  it("rejects input larger than the limit instead of truncating", async () => {
    const stream = Readable.from([Buffer.alloc(6), Buffer.alloc(6)]);

    await expect(readStdin(stream, { maxBytes: 10 })).rejects.toThrow(
      UsageError,
    );
  });

  it("accepts input exactly at the limit", async () => {
    const stream = Readable.from([Buffer.from("1234567890")]);

    await expect(readStdin(stream, { maxBytes: 10 })).resolves.toBe(
      "1234567890",
    );
  });

  it("rejects with an AbortError when the signal fires mid-read", async () => {
    const stream = new PassThrough();
    const controller = new AbortController();

    const reading = readStdin(stream, { signal: controller.signal });
    stream.write("partial");
    controller.abort();

    await expect(reading).rejects.toMatchObject({ name: "AbortError" });
  });
});
