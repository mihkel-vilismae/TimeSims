export type DebugLogLine = {
  tMs: number;
  text: string;
};

export type DebugLogSubscriber = (lines: DebugLogLine[]) => void;

export type DebugLogPort = {
  append(text: string): void;
  clear(): void;
  getLines(): DebugLogLine[];
  subscribe(fn: DebugLogSubscriber): () => void;
};

/**
 * DOM-agnostic debug log buffer for the DebugPanel.
 * This is UI-only and must never influence deterministic simulation state.
 */
export function createDebugLog(maxLines = 500): DebugLogPort {
  let lines: DebugLogLine[] = [];
  const subs = new Set<DebugLogSubscriber>();

  function emit(): void {
    const snapshot = lines;
    for (const fn of subs) fn(snapshot);
  }

  return {
    append(text: string) {
      const tMs = Date.now();
      lines = [...lines, { tMs, text }];
      if (lines.length > maxLines) {
        lines = lines.slice(lines.length - maxLines);
      }
      emit();
    },

    clear() {
      lines = [];
      emit();
    },

    getLines() {
      return lines;
    },

    subscribe(fn: DebugLogSubscriber) {
      subs.add(fn);
      fn(lines);
      return () => {
        subs.delete(fn);
      };
    },
  };
}
