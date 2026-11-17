# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run ask -- "prompt"                  # run the CLI from source (tsx)
npm run build && npm start -- "prompt"   # run the bundled CLI
npm test                                 # all tests (Vitest)
npx vitest run src/cli/run.spec.ts       # one spec file
npx vitest run -t "passes --system"      # tests matching a name
npm run typecheck                        # tsc --noEmit
npm run lint                             # Biome; `npm run lint:fix` applies fixes
```

Running the CLI for real needs `ANTHROPIC_API_KEY` (`.env` or shell). Tests need no key and make no network calls.

## Architecture

`claude-ask` is a single-turn CLI over the Anthropic SDK. Dependencies are injected, so almost nothing touches the network or a terminal directly:

- `src/cli/index.ts` assembles the real dependencies (env, SIGINT, spinner, stdin, console). It is not unit tested.
- `src/cli/run.ts`: `run(argv, deps)` is the whole CLI flow and returns an exit code. Tests drive it with fakes (`setup()` in `run.spec.ts`). New CLI behaviour goes here.
- `src/services/claude.ts`: `createClaudeService({ client, model, maxTokens })` gives `ask`, `askWithUsage` (`messages.create`) and `streamWithUsage` (`messages.stream`). The client is typed as the narrow `MessagesClient` so tests pass a fake. Per-request options (`signal`, `system`) are passed per call.
- `src/index.ts`: public library entry and `createDefaultService`, which builds the real SDK client.
- `src/config/`: `loadConfig(env, overrides)` merges flags > environment > `DEFAULTS`. Only `model` and `maxTokens` are config; per-request options such as `--system` are CLI args.

Flow: `parseCliArgs` → read piped stdin (`buildPrompt` wraps it in `<stdin>` tags) → `createService` → `streamWithUsage`, or `askWithUsage` with `--json`.

## Conventions

- stdout carries only the answer (or JSON). Spinner, usage, warnings and errors go to stderr, and `format.ts` colours with `chalkStderr`.
- Auth is `ANTHROPIC_API_KEY` only, passed explicitly so the SDK never falls back to `ANTHROPIC_AUTH_TOKEN` or login profiles.
- `.env` is allowlisted (`ENV_FILE_KEYS` in `src/config/env.ts`) to `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` and `CLAUDE_MAX_TOKENS`. Shell variables win over `.env`.
- A refusal is detected only after the stream ends, so partial text may already be on stdout.
- A model missing from `src/constants/pricing.ts` reports cost as `unknown`; add an entry when supporting a new model.
- ESM with `nodenext`: relative imports need the `.js` extension. Types live in a `types.ts` beside each module, and specs sit next to their module (`foo.spec.ts`).

Planned work is in `docs/ROADMAP.md`.
