import type { DebugSettingsStore } from '../../state/debugSettings';
import type { DebugLogPort } from '../../../adapters/uiOverlay/DebugLog';

export type DebugCommandContext = {
  settings: DebugSettingsStore;
  log: DebugLogPort;
};

export type DebugCommandHandler = (args: string[], ctx: DebugCommandContext) => void;

export type DebugCommandDef = {
  name: string;
  help: string;
  handler: DebugCommandHandler;
};

function parseOnOffToggle(arg: string | undefined): 'on' | 'off' | 'toggle' {
  const v = (arg ?? 'toggle').toLowerCase();
  if (v === 'on' || v === 'true' || v === '1') return 'on';
  if (v === 'off' || v === 'false' || v === '0') return 'off';
  return 'toggle';
}

export function createDefaultDebugCommandRegistry(): Map<string, DebugCommandDef> {
  const defs: DebugCommandDef[] = [
    {
      name: 'help',
      help: 'List commands',
      handler: (_args, ctx) => {
        ctx.log.append('[help] Commands: /help /clear /ping /enable <on|off|toggle> /verbose <on|off|toggle> /cats /cat <name> <on|off|toggle>');
      },
    },
    {
      name: 'clear',
      help: 'Clear debug log',
      handler: (_args, ctx) => {
        ctx.log.clear();
        ctx.log.append('[debug] cleared');
      },
    },
    {
      name: 'ping',
      help: 'Append a ping line',
      handler: (_args, ctx) => {
        ctx.log.append('[ping]');
      },
    },
    {
      name: 'enable',
      help: 'Master debug switch: /enable on|off|toggle',
      handler: (args, ctx) => {
        const mode = parseOnOffToggle(args[0]);
        const next = mode === 'toggle' ? !ctx.settings.get().enabled : mode === 'on';
        ctx.settings.patch({ enabled: next });
        ctx.log.append(`[debug] enabled => ${next}`);
      },
    },
    {
      name: 'verbose',
      help: 'Verbose switch: /verbose on|off|toggle',
      handler: (args, ctx) => {
        const mode = parseOnOffToggle(args[0]);
        const next = mode === 'toggle' ? !ctx.settings.get().verbose : mode === 'on';
        ctx.settings.patch({ verbose: next });
        ctx.log.append(`[debug] verbose => ${next}`);
      },
    },
    {
      name: 'cats',
      help: 'List category toggles',
      handler: (_args, ctx) => {
        const cats = ctx.settings.get().categories;
        const keys = Object.keys(cats).sort();
        if (!keys.length) {
          ctx.log.append('[debug] categories: (none)');
          return;
        }
        ctx.log.append(`[debug] categories: ${keys.map((k) => `${k}=${cats[k] ? 'on' : 'off'}`).join(' ')}`);
      },
    },
    {
      name: 'cat',
      help: 'Set category: /cat <name> <on|off|toggle>',
      handler: (args, ctx) => {
        const name = String(args[0] ?? '').trim();
        if (!name) {
          ctx.log.append('[debug] usage: /cat <name> <on|off|toggle>');
          return;
        }
        const mode = parseOnOffToggle(args[1]);
        const cur = !!ctx.settings.get().categories[name];
        const next = mode === 'toggle' ? !cur : mode === 'on';
        ctx.settings.patch({ categories: { [name]: next } });
        ctx.log.append(`[debug] category ${name} => ${next}`);
      },
    },
  ];

  return new Map(defs.map((d) => [d.name, d]));
}
