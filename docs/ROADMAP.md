# Roadmap

Roughly in priority order. Sizes: **S** under an hour, **M** a few hours,
**L** a day or more. Tick items off as they land.

## Next

### [ ] CI (S)

- GitHub Actions on push and pull request, Node 20.x and 22.x.
- `npm ci` → `npm run typecheck` → `npm run lint` → `npm test` → `npm run build`.
- No API key needed: tests use fakes.

### [ ] Verbose / debug logging (S)

- `--verbose` flag and `DEBUG=claude-ask` env var.
- stderr only: resolved config (never the API key), request parameters, time to
  first token, total duration, request ID, stop reason.
- A small injected `debug()` helper in `src/lib/logger.ts`; no logging framework.

### [ ] End-to-end CLI test (M)

- Spawn the built `dist/cli/index.js` against a local mock HTTP server
  (`ANTHROPIC_BASE_URL`).
- Cover the happy path, `--json`, stdin, API error and exit codes.
- Run it in CI after `build`.

### [ ] Exit code contract (S)

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Usage error (bad flags, empty prompt, input too large) |
| 2 | API or network error |
| 3 | Refused by the model (`stop_reason: "refusal"`) |
| 130 | Interrupted (Ctrl+C) |

- Extend `EXIT_CODES` in `src/constants/exit-codes.ts`, document the codes in
  `--help`, and test each. The service needs to throw typed errors so `run()`
  can tell them apart.

### [ ] User config file (M)

- `~/.config/claude-ask/config.json` (respect `XDG_CONFIG_HOME`) and an optional
  project-level `.claude-askrc.json`.
- Precedence: defaults < user config < project config < env < flags.
- Validate with `zod`; errors name the file path and field.
- `claude-ask config path` / `claude-ask config show` once subcommands exist.

### [ ] Subcommands with `commander` (M)

- Replace `util.parseArgs` once there is more than one action (`claude-ask`,
  `claude-ask config …`, `claude-ask chat`). `run()` stays the core.

### [ ] Global install and releases (S → M)

- Document `npm link`.
- If publishing: package name, `changesets`, a CI release workflow with npm
  provenance; check `files`, `bin`, `exports` and `engines` first.

### [ ] Retry and timeout flags (S)

- `--timeout <seconds>` and `--retries <n>`, passed to the SDK client options.

## Later

### [ ] Interactive chat mode: `claude-ask -i` / `claude-ask chat` (L)

- A REPL that keeps history in memory and streams each answer.
- Slash commands: `/exit`, `/clear`, `/model <id>`, `/usage`.
- Append the full `response.content` to history, not just the text.
- Ctrl+C cancels the current turn, not the session.

### [ ] System prompt and prompt templates (M)

- **Done:** `--system "<text>"`.
- `--system-file <path>`.
- Named templates in the config dir (`templates/review.md`), used as
  `claude-ask --template review < diff.txt`, with a `{{input}}` placeholder only.

### [ ] File attachments: `--file <path>` (M)

- Repeatable. Text files are inlined in `<file path="…">…</file>` tags; images
  and PDFs are sent as `image` / `document` content blocks.
- Reject files that are too large or of an unsupported type.

### [ ] Spend tracking across sessions (M)

- Append each request's model, tokens, cost and timestamp to a local JSONL log.
- `claude-ask usage`: totals for today, this week, this month and per model.
- `--budget <usd>`: warn or refuse when today's spend would exceed it.

### [ ] Keep the pricing table current (S, recurring)

- Test that every model in `DEFAULTS` and the README has an entry in
  `src/constants/pricing.ts`.
