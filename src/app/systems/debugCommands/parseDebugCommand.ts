export type DebugCommandParseResult = {
  name: string;
  args: string[];
} | null;

export function parseDebugCommand(line: string): DebugCommandParseResult {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('/')) return null;

  const parts = trimmed.slice(1).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;

  const [name, ...args] = parts;
  return { name: String(name).toLowerCase(), args };
}
