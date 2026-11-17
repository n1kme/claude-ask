import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { createSpinner, noopSpinner } from "./spinner.js";

function streamWith(isTTY: boolean, columns = 80) {
  // Terminal methods ora uses to redraw its line.
  const terminal = {
    isTTY,
    columns,
    cursorTo: (_x: number, _y?: number | (() => void), done?: () => void) => {
      if (typeof _y === "function") _y();
      done?.();
      return true;
    },
    clearLine: (_dir: number, done?: () => void) => {
      done?.();
      return true;
    },
    moveCursor: (_dx: number, _dy: number, done?: () => void) => {
      done?.();
      return true;
    },
  };
  const stream = Object.assign(new PassThrough(), terminal);
  let written = "";
  stream.on("data", (chunk) => {
    written += chunk;
  });
  return {
    stream: stream as unknown as NodeJS.WriteStream,
    written: () => written,
  };
}

describe("createSpinner", () => {
  it("returns a no-op spinner when the stream is not a terminal", () => {
    const { stream, written } = streamWith(false);

    const spinner = createSpinner("Thinking...", stream);
    spinner.start();
    spinner.stop();

    expect(spinner).toBe(noopSpinner);
    expect(written()).toBe("");
  });

  it("returns a no-op spinner for a terminal that reports zero columns", () => {
    const { stream } = streamWith(true, 0);

    expect(createSpinner("Thinking...", stream)).toBe(noopSpinner);
  });

  it("draws to the stream when it is a terminal", async () => {
    const { stream, written } = streamWith(true);

    const spinner = createSpinner("Thinking...", stream);
    spinner.start();
    spinner.stop();
    await new Promise((resolve) => setImmediate(resolve));

    expect(written()).toContain("Thinking...");
  });

  it("writes nothing when stopped again after it has stopped", async () => {
    const { stream, written } = streamWith(true);
    const flush = () => new Promise((resolve) => setImmediate(resolve));

    const spinner = createSpinner("Thinking...", stream);
    spinner.start();
    spinner.stop();
    await flush();
    const afterFirstStop = written();
    spinner.stop();
    spinner.stop();
    await flush();

    expect(written()).toBe(afterFirstStop);
  });

  it("can be stopped when it was never started", () => {
    const { stream } = streamWith(true);

    const spinner = createSpinner("x", stream);

    expect(() => spinner.stop()).not.toThrow();
  });
});
