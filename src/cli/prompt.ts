// Combines the prompt from arguments with piped stdin. Returns null when there
// is nothing to send. Piped content next to an instruction is wrapped in
// <stdin> tags so the model can tell the instruction from the data.
export function buildPrompt(
  prompt: string,
  stdin: string | null,
): string | null {
  const instruction = prompt.trim();
  const piped = stdin?.trimEnd() ?? "";

  if (!piped.trim()) return instruction || null;
  if (!instruction) return piped;
  return `${instruction}\n\n<stdin>\n${piped}\n</stdin>`;
}
