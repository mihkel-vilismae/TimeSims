import type { DebugCommandContext } from './debugCommandRegistry';
import { createDefaultDebugCommandRegistry } from './debugCommandRegistry';
import { parseDebugCommand } from './parseDebugCommand';

export type DebugCommandRunner = {
  run(line: string): void;
  suggest(line: string): { command: string; help: string }[];
  getHelp(commandName: string): string | null;
  setInspect(inspect: DebugCommandContext['inspect'] | undefined): void;
};

export function createDebugCommandRunner(ctx: DebugCommandContext): DebugCommandRunner {
  const registry = createDefaultDebugCommandRegistry();
  let inspect = ctx.inspect;

  function normalizeLine(line: string): string {
    return String(line ?? '').trim();
  }

  function getDefs(): { command: string; help: string }[] {
    return [...registry.values()]
      .map((d) => ({ command: `/${d.name}`, help: d.help }))
      .sort((a, b) => a.command.localeCompare(b.command));
  }

  return {
    run(line: string) {
      const trimmed = normalizeLine(line);
      if (!trimmed) return;

      const ctxWithInspect: DebugCommandContext = { ...ctx, inspect };

      const parsed = parseDebugCommand(trimmed);
      if (!parsed) {
        ctxWithInspect.log.append(`[user] ${trimmed}`);
        return;
      }

      const def = registry.get(parsed.name);
      if (!def) {
        ctxWithInspect.log.append(`[debug] unknown command: /${parsed.name} (try /help)`);
        return;
      }

      try {
        def.handler(parsed.args, ctxWithInspect);
      } catch (err) {
        ctxWithInspect.log.append(`[debug] command failed: /${parsed.name} (${String(err)})`);
      }
    },

    suggest(line: string) {
      const trimmed = normalizeLine(line);
      if (!trimmed.startsWith('/')) return [];
      const [head] = trimmed.split(/\s+/, 1);
      const prefix = head.toLowerCase();
      return getDefs().filter((d) => d.command.toLowerCase().startsWith(prefix)).slice(0, 10);
    },

    getHelp(commandName: string) {
      const name = String(commandName ?? '').trim().replace(/^\//, '');
      if (!name) return null;
      return registry.get(name)?.help ?? null;
    },

    setInspect(next) {
      inspect = next;
    },
  };
}
