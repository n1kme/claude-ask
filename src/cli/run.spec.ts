import Anthropic from "@anthropic-ai/sdk";
import { chalkStderr } from "chalk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EXIT_CODES } from "../constants/exit-codes.js";
import type {
  AskResult,
  ClaudeService,
  StreamOptions,
} from "../services/types.js";
import { UsageError } from "./args.js";
import { run } from "./run.js";
import type { CliDeps } from "./types.js";

const RESULT: AskResult = {
  model: "claude-haiku-5-5",
  text: "Hello",
  usage: {
    input_tokens: 1,
    output_tokens: 2,
    cache_creation_input_tokens: null,
    cache_read_input_tokens: null,
  },
  stopReason: "end_turn",
  cost: 0.000001,
};

interface Setup {
  deps: CliDeps;
  service: {
    ask: ReturnType<typeof vi.fn>;
    askWithUsage: ReturnType<typeof vi.fn>;
    streamWithUsage: ReturnType<typeof vi.fn>;
  };
  createService: ReturnType<typeof vi.fn>;
  readStdin: ReturnType<typeof vi.fn>;
  spinner: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  // Everything written, in order, tagged by stream.
  events: string[];
  stdout: () => string;
  stderr: () => string;
}

function setup(
  overrides: {
    deltas?: string[];
    stdin?: string | null;
    streamError?: Error;
    deps?: Partial<CliDeps>;
  } = {},
): Setup {
  const events: string[] = [];
  const output = {
    log: vi.fn((text: string) => events.push(`out:${text}\n`)),
    error: vi.fn((text: string) => events.push(`err:${text}\n`)),
    write: vi.fn((text: string) => events.push(`out:${text}`)),
  };
  const spinner = {
    start: vi.fn(() => events.push("spinner:start")),
    stop: vi.fn(() => events.push("spinner:stop")),
  };
  const service = {
    ask: vi.fn(),
    askWithUsage: vi.fn(async () => RESULT),
    streamWithUsage: vi.fn(
      async (_message: string, options?: StreamOptions) => {
        for (const delta of overrides.deltas ?? ["Hel", "lo"]) {
          options?.onText?.(delta);
        }
        if (overrides.streamError) throw overrides.streamError;
        return RESULT;
      },
    ),
  };
  const createService = vi.fn(() => service as unknown as ClaudeService);
  const readStdin = vi.fn(async () => overrides.stdin ?? null);

  const deps: CliDeps = {
    createService,
    readStdin,
    spinner,
    output,
    version: "1.2.3",
    ...overrides.deps,
  };

  const collect = (prefix: string) => () =>
    events
      .filter((event) => event.startsWith(prefix))
      .map((event) => event.slice(prefix.length))
      .join("");

  return {
    deps,
    service,
    createService,
    readStdin,
    spinner,
    events,
    stdout: collect("out:"),
    stderr: collect("err:"),
  };
}

describe("run", () => {
  const originalLevel = chalkStderr.level;

  beforeEach(() => {
    chalkStderr.level = 0;
  });

  afterEach(() => {
    chalkStderr.level = originalLevel;
  });

  describe("arguments", () => {
    it("prints a usage hint and fails when there is no prompt", async () => {
      const s = setup();

      await expect(run([], s.deps)).resolves.toBe(EXIT_CODES.error);
      expect(s.service.streamWithUsage).not.toHaveBeenCalled();
      expect(s.stderr()).toContain("Usage:");
    });

    it("never reads stdin with --no-stdin", async () => {
      const s = setup({ stdin: "piped" });

      await run(["--no-stdin", "hi"], s.deps);

      expect(s.readStdin).not.toHaveBeenCalled();
      expect(s.service.streamWithUsage).toHaveBeenCalledWith(
        "hi",
        expect.anything(),
      );
    });

    it("warns on stderr when the answer hit the token limit", async () => {
      const s = setup();
      s.service.streamWithUsage.mockResolvedValueOnce({
        ...RESULT,
        stopReason: "max_tokens",
      });

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.ok);
      expect(s.stderr()).toContain("cut off at the token limit");
    });

    it("joins positional arguments into one message", async () => {
      const s = setup();

      await run(["what", "is", "up"], s.deps);

      expect(s.service.streamWithUsage).toHaveBeenCalledWith(
        "what is up",
        expect.anything(),
      );
    });

    it("passes --system to the request", async () => {
      const s = setup();

      await run(["--system", "Reply in JSON", "hi"], s.deps);

      expect(s.service.streamWithUsage).toHaveBeenCalledWith(
        "hi",
        expect.objectContaining({ system: "Reply in JSON" }),
      );
    });

    it("passes --system to a --json request too", async () => {
      const s = setup();

      await run(["--json", "--system", "Reply in JSON", "hi"], s.deps);

      expect(s.service.askWithUsage).toHaveBeenCalledWith(
        "hi",
        expect.objectContaining({ system: "Reply in JSON" }),
      );
    });

    it("passes --model and --max-tokens as config overrides", async () => {
      const s = setup();

      await run(["-m", "m1", "--max-tokens", "64", "hi"], s.deps);

      expect(s.createService).toHaveBeenCalledWith({
        model: "m1",
        maxTokens: 64,
      });
    });

    it("reports bad flags with the usage hint and doesn't call the API", async () => {
      const s = setup();

      await expect(run(["--nope", "hi"], s.deps)).resolves.toBe(
        EXIT_CODES.error,
      );
      expect(s.stderr()).toContain("Error:");
      expect(s.stderr()).toContain("Usage:");
      expect(s.createService).not.toHaveBeenCalled();
      expect(s.readStdin).not.toHaveBeenCalled();
    });

    it("prints help and succeeds without reading stdin or calling the API", async () => {
      const s = setup();

      await expect(run(["--help"], s.deps)).resolves.toBe(EXIT_CODES.ok);
      expect(s.stdout()).toContain("Usage");
      expect(s.readStdin).not.toHaveBeenCalled();
      expect(s.createService).not.toHaveBeenCalled();
    });

    it("prints the version and succeeds", async () => {
      const s = setup();

      await expect(run(["-v"], s.deps)).resolves.toBe(EXIT_CODES.ok);
      expect(s.stdout()).toBe("1.2.3\n");
    });
  });

  describe("streaming output", () => {
    it("streams the answer to stdout and ends with a newline", async () => {
      const s = setup({ deltas: ["Hel", "lo"] });

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.ok);
      expect(s.stdout()).toBe("Hello\n");
    });

    it("prints usage to stderr, keeping stdout to the answer only", async () => {
      const s = setup();

      await run(["hi"], s.deps);

      expect(s.stderr()).toContain("Tokens: 1 in / 2 out");
      expect(s.stdout()).not.toContain("Tokens");
    });

    it("hides usage with --no-usage", async () => {
      const s = setup();

      await run(["--no-usage", "hi"], s.deps);

      expect(s.stderr()).toBe("");
      expect(s.stdout()).toBe("Hello\n");
    });

    it("starts the spinner first and stops it before the first text", async () => {
      const s = setup({ deltas: ["Hel", "lo"] });

      await run(["hi"], s.deps);

      expect(s.events.slice(0, 3)).toEqual([
        "spinner:start",
        "spinner:stop",
        "out:Hel",
      ]);
    });

    it("stops the spinner and reports an error when the request fails", async () => {
      const s = setup({ deltas: [], streamError: new Error("network down") });

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.error);
      expect(s.spinner.stop).toHaveBeenCalled();
      expect(s.stderr()).toBe("Error: network down\n");
    });

    it("ends a partly streamed answer with a newline before the error", async () => {
      const s = setup({ deltas: ["Par"], streamError: new Error("dropped") });

      await run(["hi"], s.deps);

      expect(s.stdout()).toBe("Par\n");
      expect(s.stderr()).toBe("Error: dropped\n");
    });

    it("reports config errors such as an invalid environment value", async () => {
      const s = setup({
        deps: {
          createService: () => {
            throw new Error("CLAUDE_MAX_TOKENS must be a positive integer");
          },
        },
      });

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.error);
      expect(s.stderr()).toContain("CLAUDE_MAX_TOKENS");
    });
  });

  describe("--json", () => {
    it("prints parseable JSON without streaming or a spinner", async () => {
      const s = setup();

      await expect(run(["--json", "hi"], s.deps)).resolves.toBe(EXIT_CODES.ok);
      expect(JSON.parse(s.stdout())).toEqual(RESULT);
      expect(s.service.streamWithUsage).not.toHaveBeenCalled();
      expect(s.spinner.start).not.toHaveBeenCalled();
      expect(s.stderr()).toBe("");
    });
  });

  describe("stdin", () => {
    it("sends piped input alone when there is no prompt", async () => {
      const s = setup({ stdin: "piped text\n" });

      await run([], s.deps);

      expect(s.service.streamWithUsage).toHaveBeenCalledWith(
        "piped text",
        expect.anything(),
      );
    });

    it("sends the prompt followed by piped input", async () => {
      const s = setup({ stdin: "data\n" });

      await run(["summarize"], s.deps);

      expect(s.service.streamWithUsage).toHaveBeenCalledWith(
        "summarize\n\n<stdin>\ndata\n</stdin>",
        expect.anything(),
      );
    });

    it("reports a usage error from reading stdin", async () => {
      const s = setup({
        deps: {
          readStdin: async () => {
            throw new UsageError("Piped input is larger than 1000000 bytes.");
          },
        },
      });

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.error);
      expect(s.stderr()).toContain("Piped input is larger");
      expect(s.createService).not.toHaveBeenCalled();
    });
  });

  describe("interruption (Ctrl+C)", () => {
    it("passes the abort signal to the request", async () => {
      const { signal } = new AbortController();
      const s = setup({ deps: { signal } });

      await run(["hi"], s.deps);

      expect(s.service.streamWithUsage).toHaveBeenCalledWith(
        "hi",
        expect.objectContaining({ signal }),
      );
    });

    it("exits 130 with Cancelled and no usage when aborted mid-stream", async () => {
      const controller = new AbortController();
      const s = setup({ deltas: ["Par"] });
      s.service.streamWithUsage.mockImplementation(
        async (_message: string, options?: StreamOptions) => {
          options?.onText?.("Par");
          controller.abort();
          throw new Anthropic.APIUserAbortError();
        },
      );
      s.deps.signal = controller.signal;

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.interrupted);
      expect(s.stdout()).toBe("Par\n");
      expect(s.stderr()).toBe("Cancelled\n");
      expect(s.spinner.stop).toHaveBeenCalled();
    });

    it("treats an abort error as a cancellation even without a signal", async () => {
      const s = setup({
        deltas: [],
        streamError: new Anthropic.APIUserAbortError(),
      });

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.interrupted);
      expect(s.stderr()).toBe("Cancelled\n");
    });

    it("exits 130 when interrupted while reading stdin", async () => {
      const controller = new AbortController();
      const abortError = Object.assign(new Error("aborted"), {
        name: "AbortError",
      });
      const s = setup({
        deps: {
          signal: controller.signal,
          readStdin: async () => {
            controller.abort();
            throw abortError;
          },
        },
      });

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.interrupted);
      expect(s.createService).not.toHaveBeenCalled();
    });

    it("exits 130 when stdin ends because of an interrupt, without calling the API", async () => {
      const controller = new AbortController();
      const s = setup({
        stdin: "partial",
        deps: {
          signal: controller.signal,
          readStdin: async () => {
            controller.abort();
            return "partial";
          },
        },
      });

      await expect(run(["hi"], s.deps)).resolves.toBe(EXIT_CODES.interrupted);
      expect(s.createService).not.toHaveBeenCalled();
    });

    it("cancels a --json request too", async () => {
      const controller = new AbortController();
      const s = setup();
      s.service.askWithUsage.mockImplementation(async () => {
        controller.abort();
        throw new Anthropic.APIUserAbortError();
      });
      s.deps.signal = controller.signal;

      await expect(run(["--json", "hi"], s.deps)).resolves.toBe(
        EXIT_CODES.interrupted,
      );
      expect(s.stdout()).toBe("");
    });
  });
});
