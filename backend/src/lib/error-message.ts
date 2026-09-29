// Drizzle wraps database errors ("Failed query: …"); the real reason is in `cause`.
// Returns the most useful text: PostgreSQL's own message, plus its detail and hint.
export function errorMessage(error: unknown): string {
  const root = (error as { cause?: unknown })?.cause ?? error;
  if (!(root instanceof Error)) return String(root);
  const { detail, hint } = root as { detail?: string; hint?: string };
  return [root.message, detail, hint].filter(Boolean).join('\n  ');
}
