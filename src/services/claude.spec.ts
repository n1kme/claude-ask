import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { createClaudeService } from "./claude.js";
import type { MessagesClient } from "./types.js";

const USAGE = {
  input_tokens: 12,
  output_tokens: 85,
  cache_creation_input_tokens: null,
  cache_read_input_tokens: null,
};

function message(
  overrides: Partial<Anthropic.Message> = {},
): Anthropic.Message {
  return {
    stop_reason: "end_turn",
    stop_details: null,
    content: [{ type: "text", text: "Hello" }],
    usage: USAGE,
    ...overrides,
  } as Anthropic.Message;
}

function refusal(): Anthropic.Message {
  return message({
    stop_reason: "refusal",
    stop_details: {
      type: "refusal",
      category: null,
      explanation: "policy",
    } as Anthropic.Message["stop_details"],
  });
}

// A fake client whose stream emits `deltas` to "text" listeners, then
// resolves `finalMessage()` with `response`.
function fakeClient(response: Anthropic.Message, deltas: string[] = []) {
  const create = vi.fn().mockResolvedValue(response);
  const stream = vi.fn((_params: unknown, _options?: unknown) => {
    const listeners: Array<(delta: string, snapshot: string) => void> = [];
    return {
      on: (
        _event: "text",
        listener: (delta: string, snapshot: string) => void,
      ) => {
        listeners.push(listener);
      },
      finalMessage: async () => {
        for (const delta of deltas) {
          for (const listener of listeners) listener(delta, delta);
        }
        return response;
      },
    };
  });
  const client: MessagesClient = { messages: { create, stream } };
  return { client, create, stream };
}

describe("createClaudeService", () => {
  describe("askWithUsage / ask", () => {
    it("sends the message with the configured model and token limit", async () => {
      const { client, create } = fakeClient(message());
      const service = createClaudeService({
        client,
        model: "claude-haiku-5-5",
        maxTokens: 256,
      });

      await service.ask("Hi there");

      expect(create).toHaveBeenCalledWith(
        {
          model: "claude-haiku-5-5",
          max_tokens: 256,
          messages: [{ role: "user", content: "Hi there" }],
        },
        { signal: undefined },
      );
    });

    it("passes the abort signal to the client", async () => {
      const { client, create } = fakeClient(message());
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });
      const { signal } = new AbortController();

      await service.askWithUsage("x", { signal });

      expect(create).toHaveBeenCalledWith(expect.anything(), { signal });
    });

    it("sends the system prompt when one is given", async () => {
      const { client, create } = fakeClient(message());
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });

      await service.askWithUsage("x", { system: "Reply in JSON" });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ system: "Reply in JSON" }),
        expect.anything(),
      );
    });

    it("leaves the system prompt out when none is given", async () => {
      const { client, create } = fakeClient(message());
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });

      await service.ask("x");

      expect(create.mock.calls[0][0]).not.toHaveProperty("system");
    });

    it("joins text blocks and skips other content", async () => {
      const { client } = fakeClient(
        message({
          content: [
            { type: "thinking", thinking: "", signature: "sig" },
            { type: "text", text: "Hello, " },
            { type: "text", text: "world" },
          ] as Anthropic.ContentBlock[],
        }),
      );
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });

      await expect(service.ask("x")).resolves.toBe("Hello, world");
    });

    it("returns the model, usage and estimated cost", async () => {
      const { client } = fakeClient(message());
      const service = createClaudeService({
        client,
        model: "claude-haiku-5-5",
        maxTokens: 1,
      });

      const result = await service.askWithUsage("x");

      expect(result.model).toBe("claude-haiku-5-5");
      expect(result.usage).toEqual(USAGE);
      expect(result.cost).toBeCloseTo((12 * 0.1 + 85 * 0.5) / 1_000_000);
    });

    it("returns a null cost for a model without pricing", async () => {
      const { client } = fakeClient(message());
      const service = createClaudeService({
        client,
        model: "unknown-model",
        maxTokens: 1,
      });

      await expect(service.askWithUsage("x")).resolves.toMatchObject({
        cost: null,
      });
    });

    it("throws when the request is refused", async () => {
      const { client } = fakeClient(refusal());
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });

      await expect(service.ask("x")).rejects.toThrow(
        "Request declined: policy",
      );
    });
  });

  describe("streamWithUsage", () => {
    it("streams with the configured model and token limit", async () => {
      const { client, stream } = fakeClient(message());
      const service = createClaudeService({
        client,
        model: "claude-haiku-5-5",
        maxTokens: 256,
      });

      await service.streamWithUsage("Hi there");

      expect(stream).toHaveBeenCalledWith(
        {
          model: "claude-haiku-5-5",
          max_tokens: 256,
          messages: [{ role: "user", content: "Hi there" }],
        },
        { signal: undefined },
      );
    });

    it("forwards text deltas in order", async () => {
      const { client } = fakeClient(message(), ["Hel", "lo", "!"]);
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });
      const onText = vi.fn();

      await service.streamWithUsage("x", { onText });

      expect(onText.mock.calls).toEqual([["Hel"], ["lo"], ["!"]]);
    });

    it("works without an onText callback", async () => {
      const { client } = fakeClient(message(), ["Hel"]);
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });

      await expect(service.streamWithUsage("x")).resolves.toMatchObject({
        text: "Hello",
      });
    });

    it("returns the same result shape as askWithUsage", async () => {
      const { client } = fakeClient(message());
      const service = createClaudeService({
        client,
        model: "claude-haiku-5-5",
        maxTokens: 1,
      });

      const result = await service.streamWithUsage("x");

      expect(result).toEqual({
        model: "claude-haiku-5-5",
        text: "Hello",
        usage: USAGE,
        stopReason: "end_turn",
        cost: expect.closeTo((12 * 0.1 + 85 * 0.5) / 1_000_000),
      });
    });

    it("passes the abort signal to the client", async () => {
      const { client, stream } = fakeClient(message());
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });
      const { signal } = new AbortController();

      await service.streamWithUsage("x", { signal });

      expect(stream).toHaveBeenCalledWith(expect.anything(), { signal });
    });

    it("sends the system prompt when one is given", async () => {
      const { client, stream } = fakeClient(message());
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });

      await service.streamWithUsage("x", { system: "Reply in JSON" });

      expect(stream).toHaveBeenCalledWith(
        expect.objectContaining({ system: "Reply in JSON" }),
        expect.anything(),
      );
    });

    it("throws when the request is refused", async () => {
      const { client } = fakeClient(refusal());
      const service = createClaudeService({ client, model: "m", maxTokens: 1 });

      await expect(service.streamWithUsage("x")).rejects.toThrow(
        "Request declined: policy",
      );
    });
  });
});
