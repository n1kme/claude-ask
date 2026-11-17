# claude-ask

`claude-ask` sends a prompt to Claude from your terminal and streams the answer back,
followed by the tokens used and an approximate cost.

```
$ claude-ask "Explain event loops in one sentence"
An event loop repeatedly checks for work (events, timers, I/O) and runs the
matching callbacks one at a time, so a single thread can juggle many tasks.

---
Tokens: 18 in / 34 out (cache write 0, cache read 0)
Approx. cost: $0.000019
```

## What it's for

- **Shell and CI scripting.** One command in, one answer out. The answer goes to
  stdout and everything else to stderr, `--json` gives machine-readable output,
  piped input becomes context, and exit codes signal failure:
  `git diff | claude-ask "Review this change"`.
- **A base for your own tooling.** The CLI is a thin layer over a small, tested
  library (`createClaudeService`) with injected dependencies. Reuse the service,
  or fork the CLI to build one shaped around your workflow.

It is deliberately one-shot: no conversation history, tools or agent loop. For an
agent that edits files and runs commands, use Claude Code.

Unofficial: this project is not affiliated with or endorsed by Anthropic.

## Install

Requires Node.js 20.12 or newer and an Anthropic API key.

```sh
npm install -g claude-ask
```

Or run it without installing: `npx claude-ask "your message"`.

## Setup

Export your key in the shell, or put it in a `.env` file in the directory you run
`claude-ask` from:

```sh
export ANTHROPIC_API_KEY=sk-ant-...
```

The app authenticates with an **API key only**, so usage is billed to your API
account. Login sessions and `ANTHROPIC_AUTH_TOKEN` are ignored, and a missing key
is an error.

## Usage

```sh
claude-ask "your message"
```

Run `claude-ask --help` for the full list. A prompt that starts with `-` must come
after `--`: `claude-ask -- "-5 degrees in F?"`.

### Flags

| Flag | Effect |
|---|---|
| `-m, --model <id>` | Model to use (default `claude-haiku-5-5`) |
| `--max-tokens <n>` | Maximum tokens in the response (default `16000`) |
| `--system <text>` | System prompt that sets Claude's behaviour |
| `--no-usage` | Hide the token and cost summary |
| `--no-stdin` | Never read piped input (for cron/CI where stdin never closes) |
| `--json` | Print `{ model, text, stopReason, usage, cost }` as JSON instead of streaming |
| `-h, --help` | Show help |
| `-v, --version` | Show the version |

### Piping input

Piped text is sent along with your prompt, wrapped in `<stdin>` tags so the model
can tell the instruction from the data. With no prompt, the piped text is sent
alone. Input over 1 MB is rejected, not truncated.

```sh
git diff | claude-ask "Review this change"
cat error.log | claude-ask --system "You are a terse SRE" "What went wrong?"
```

### Scripting

The answer goes to **stdout**; the spinner, usage summary, warnings and errors go
to **stderr**, so pipes and redirects only see the answer:

```sh
claude-ask "Write a haiku" > haiku.txt
claude-ask --json "Say hi" | jq -r .text
```

Ctrl+C cancels the request and prints `Cancelled`. Text already streamed stays on
screen, and a second Ctrl+C exits immediately.

| Exit code | Meaning |
|---|---|
| 0 | Success |
| 1 | Error: bad flags, empty prompt, input too large, API/network error, or a refused request |
| 130 | Interrupted (Ctrl+C) |

## Configuration

Settings come from, in order of priority: flags (`--model`, `--max-tokens`), then
environment variables (including a `.env` file in the current directory), then
the built-in defaults.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | API key (required) |
| `CLAUDE_MODEL` | Default model |
| `CLAUDE_MAX_TOKENS` | Default maximum tokens (positive integer) |

Variables already set in your shell are never overridden by `.env`, and only
these three are read from it.

Costs are estimates from `src/constants/pricing.ts`; a model with no entry shows
`unknown`. Your Anthropic Console is the source of truth for billing.

## Use as a library

The package is ESM and exports the same service the CLI uses. It reads
`ANTHROPIC_API_KEY` from the environment:

```ts
import { askWithUsage } from "claude-ask";

const { text, usage, cost } = await askWithUsage("Say hi");
```

For control over the model, token limit or client, build a service with
`createClaudeService({ client, model, maxTokens })`.

## Development

```sh
git clone https://github.com/n1kme/claude-ask.git
cd claude-ask
nvm use                  # Node 22, from .nvmrc
npm install
cp .env.example .env     # then put your key in .env
npm run ask -- "hi"      # run from source
```

```sh
npm test               # tests (Vitest); no API key or network needed
npm run typecheck      # tsc --noEmit
npm run lint           # Biome lint + format check; `lint:fix` applies fixes
npm run build          # bundle to dist/ with tsup
```

Also available: `test:watch`, `test:coverage`, `format`.

```
src/
├── index.ts       public API: ask, askWithUsage, createClaudeService, …
├── cli/           flag parsing, the CLI flow, spinner, output formatting
├── services/      createClaudeService and cost estimation
├── config/        environment and settings
└── constants/     defaults, pricing, exit codes, limits
```

Specs sit next to the module they test (`foo.ts` → `foo.spec.ts`).

## More

- [Roadmap](docs/ROADMAP.md): what comes next

## License

[ISC](LICENSE)
