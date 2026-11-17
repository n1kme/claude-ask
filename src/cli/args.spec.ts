import { describe, expect, it } from "vitest";
import { UsageError, parseCliArgs } from "./args.js";

describe("parseCliArgs", () => {
  it("joins positional arguments into the prompt", () => {
    expect(parseCliArgs(["what", "is", "up"]).prompt).toBe("what is up");
  });

  it("uses sensible defaults", () => {
    expect(parseCliArgs([])).toEqual({
      prompt: "",
      model: undefined,
      maxTokens: undefined,
      showUsage: true,
      useStdin: true,
      json: false,
      help: false,
      version: false,
    });
  });

  it("parses --model and its short form", () => {
    expect(parseCliArgs(["--model", "m1", "hi"]).model).toBe("m1");
    expect(parseCliArgs(["-m", "m2", "hi"]).model).toBe("m2");
    expect(parseCliArgs(["--model=m3", "hi"]).model).toBe("m3");
  });

  it("parses --system as the system prompt", () => {
    expect(parseCliArgs(["--system", "Be terse", "hi"]).system).toBe(
      "Be terse",
    );
    expect(parseCliArgs(["--system=Be terse", "hi"]).system).toBe("Be terse");
  });

  it("parses --max-tokens as a number", () => {
    expect(parseCliArgs(["--max-tokens", "256"]).maxTokens).toBe(256);
  });

  it.each(["abc", "0", "-5", "1.5", "1e3", "0x10", " 5 "])(
    "rejects an invalid --max-tokens of %p",
    (value) => {
      expect(() => parseCliArgs([`--max-tokens=${value}`])).toThrow(UsageError);
      expect(() => parseCliArgs([`--max-tokens=${value}`])).toThrow(
        "--max-tokens must be a positive integer",
      );
    },
  );

  it("turns off usage with --no-usage", () => {
    expect(parseCliArgs(["--no-usage"]).showUsage).toBe(false);
  });

  it("turns off stdin with --no-stdin", () => {
    expect(parseCliArgs(["--no-stdin", "hi"]).useStdin).toBe(false);
  });

  it("parses --json", () => {
    expect(parseCliArgs(["--json"]).json).toBe(true);
  });

  it("parses help and version flags with short forms", () => {
    expect(parseCliArgs(["--help"]).help).toBe(true);
    expect(parseCliArgs(["-h"]).help).toBe(true);
    expect(parseCliArgs(["--version"]).version).toBe(true);
    expect(parseCliArgs(["-v"]).version).toBe(true);
  });

  it("accepts flags before and after the prompt", () => {
    const args = parseCliArgs(["hello", "--json", "-m", "m1", "world"]);

    expect(args).toMatchObject({
      prompt: "hello world",
      json: true,
      model: "m1",
    });
  });

  it("treats everything after -- as the prompt", () => {
    expect(parseCliArgs(["--", "-5", "degrees"]).prompt).toBe("-5 degrees");
  });

  it("rejects unknown flags", () => {
    expect(() => parseCliArgs(["--nope"])).toThrow(UsageError);
  });

  it("rejects a flag that is missing its value", () => {
    expect(() => parseCliArgs(["--model"])).toThrow(UsageError);
  });
});
