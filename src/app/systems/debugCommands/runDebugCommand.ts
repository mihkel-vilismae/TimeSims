import type { DebugCommandContext } from './debugCommandRegistry';
import { createDefaultDebugCommandRegistry } from './debugCommandRegistry';
import { parseDebugCommand } from './parseDebugCommand';

export type DebugCommandRunner = {
  run(line: string): void;
};

export function createDebugCommandRunner(ctx: DebugCommandContext): DebugCommandRunner {
  const registry = createDefaultDebugCommandRegistry();

  return {
    run(line: string) {
      const trimmed = line.trim();
      if (!trimmed) return;

      const parsed = parseDebugCommand(trimmed);
      if (!parsed) {
        // Non-command lines are treated as user notes.
        ctx.log.append(`[user] ${trimmed}`);
        return;
      }

      const def = registry.get(parsed.name);
      if (!def) {
        ctx.log.append(`[debug] unknown command: /${parsed.name} (try /help)`);
        return;
      }

      try {
        def.handler(parsed.args, ctx);
      } catch (err) {
        ctx.log.append(`[debug] command failed: /${parsed.name} (${String(err)})`);
      }
    },
  };
}
