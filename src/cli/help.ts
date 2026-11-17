import chalk from "chalk";
import { DEFAULTS } from "../constants/defaults.js";

const heading = (text: string) => chalk.bold.cyan(text);
const flag = (text: string) => chalk.green(text);

export function formatHelp(): string {
  const options: Array<[string, string]> = [
    ["-m, --model <id>", `Model to use (default: ${DEFAULTS.model})`],
    [
      "    --max-tokens <n>",
      `Maximum tokens in the response (default: ${DEFAULTS.maxTokens})`,
    ],
    ["    --system <text>", "System prompt that sets Claude's behaviour"],
    ["    --no-usage", "Hide the token and cost summary"],
    [
      "    --no-stdin",
      "Do not read piped input (for cron/CI with an open stdin)",
    ],
    ["    --json", "Print the result as JSON (no streaming)"],
    ["-h, --help", "Show this help"],
    ["-v, --version", "Show the version"],
  ];
  const environment: Array<[string, string]> = [
    ["ANTHROPIC_API_KEY", "API key (required; login sessions are not used)"],
    ["CLAUDE_MODEL", "Default model"],
    ["CLAUDE_MAX_TOKENS", "Default maximum tokens"],
  ];
  const examples = [
    'claude-ask "Explain event loops in one paragraph"',
    'git diff | claude-ask "Review this change"',
    'claude-ask --json "Say hi" | jq -r .text',
    'claude-ask -m claude-sonnet-5-5 --no-usage "Summarize Hamlet"',
    'claude-ask -- "-5 degrees in Fahrenheit?"',
  ];

  const pad = (rows: Array<[string, string]>) => {
    const width = Math.max(...rows.map(([name]) => name.length));
    return rows.map(
      ([name, description]) => `  ${flag(name.padEnd(width))}  ${description}`,
    );
  };

  return [
    `${chalk.bold("claude-ask")} - send a prompt to Claude from your terminal`,
    "",
    heading("Usage"),
    `  claude-ask [options] ${chalk.cyan('"your message"')}`,
    `  cat file | claude-ask [options] ${chalk.cyan('"instruction"')}`,
    "",
    heading("Options"),
    ...pad(options),
    "",
    heading("Environment"),
    ...pad(environment),
    chalk.gray(
      "  Variables are also read from a .env file in the current directory.",
    ),
    chalk.gray("  Flags override environment variables."),
    "",
    heading("Examples"),
    ...examples.map((example) => `  ${chalk.dim("$")} ${example}`),
    "",
    chalk.gray(
      'A prompt that starts with "-" must come after "--", as in the last example.',
    ),
  ].join("\n");
}
