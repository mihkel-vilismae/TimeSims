import type { DebugSettingsStore } from '../../state/debugSettings';
import type { DebugLogPort } from '../../../adapters/uiOverlay/DebugLog';

export type DebugCommandContext = {
  settings: DebugSettingsStore;
  log: DebugLogPort;
  inspect?: DebugInspectPort;
};

export type DebugUnitSummary = {
  id: string;
  kind: string;
  faction: string;
  alive: boolean;
  hp?: number;
  maxHp?: number;
};

export type DebugUnitDetail = DebugUnitSummary & {
  position?: { x: number; y: number; z: number };
  yawDeg?: number;
  speedMps?: number;
  visionRadius?: number;
  weaponRadius?: number;
};

export type DebugWorldInfo = {
  mode?: string;
  executionLocked?: boolean;
  markerCount?: number;
  execFrameCount?: number;
  execT?: number;
  prepareDurationSec?: number;
  unitCount?: number;
  enemyCount?: number;
  buildingCount?: number;
};

export type DebugInspectPort = {
  getActiveUnitId(): string | null;
  listUnits(): DebugUnitSummary[];
  getUnit(id: string): DebugUnitDetail | null;
  getWorldInfo(): DebugWorldInfo;
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
  const defs: DebugCommandDef[] = [];

  const formatCommandList = (): string => {
    const names = defs.map((d) => `/${d.name}`).sort((a, b) => a.localeCompare(b));
    return names.join(' ');
  };

  defs.push({
    name: 'help',
    help: 'List commands or show help: /help [command]',
    handler: (args, ctx) => {
      const which = String(args[0] ?? '').trim().replace(/^\//, '');
      if (which) {
        const def = defs.find((d) => d.name === which);
        if (!def) {
          ctx.log.append(`[help] unknown command: /${which}`);
          ctx.log.append(`[help] Commands: ${formatCommandList()}`);
          return;
        }
        ctx.log.append(`[help] /${def.name} — ${def.help}`);
        return;
      }
      ctx.log.append(`[help] Commands: ${formatCommandList()}`);
      ctx.log.append('[help] Tip: type "/" then press Tab to autocomplete (in Debug panel).');
    },
  });

  defs.push({
    name: 'clear',
    help: 'Clear debug log',
    handler: (_args, ctx) => {
      ctx.log.clear();
      ctx.log.append('[debug] cleared');
    },
  });

  defs.push({
    name: 'ping',
    help: 'Append a ping line',
    handler: (_args, ctx) => {
      ctx.log.append('[ping]');
    },
  });

  defs.push({
    name: 'enable',
    help: 'Master debug switch: /enable on|off|toggle',
    handler: (args, ctx) => {
      const mode = parseOnOffToggle(args[0]);
      const next = mode === 'toggle' ? !ctx.settings.get().enabled : mode === 'on';
      ctx.settings.patch({ enabled: next });
      ctx.log.append(`[debug] enabled => ${next}`);
    },
  });

  defs.push({
    name: 'verbose',
    help: 'Verbose switch: /verbose on|off|toggle',
    handler: (args, ctx) => {
      const mode = parseOnOffToggle(args[0]);
      const next = mode === 'toggle' ? !ctx.settings.get().verbose : mode === 'on';
      ctx.settings.patch({ verbose: next });
      ctx.log.append(`[debug] verbose => ${next}`);
    },
  });

  defs.push({
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
  });

  defs.push({
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
  });

  const requireInspect = (ctx: DebugCommandContext): DebugInspectPort | null => {
    if (!ctx.inspect) {
      ctx.log.append('[debug] info commands unavailable (no inspector attached)');
      ctx.log.append('[debug] hint: this should be wired by the runtime after boot.');
      return null;
    }
    return ctx.inspect;
  };

  defs.push({
    name: 'active_unit_info',
    help: 'Show selected unit info: /active_unit_info',
    handler: (_args, ctx) => {
      const inspect = requireInspect(ctx);
      if (!inspect) return;
      const id = inspect.getActiveUnitId();
      if (!id) {
        ctx.log.append('[Active Unit] (none selected)');
        return;
      }
      const u = inspect.getUnit(id);
      if (!u) {
        ctx.log.append(`[Active Unit] selected=${id} (not found)`);
        return;
      }
      ctx.log.append('[Active Unit]');
      ctx.log.append(`id: ${u.id}`);
      ctx.log.append(`type: ${u.kind}`);
      ctx.log.append(`faction: ${u.faction}`);
      ctx.log.append(`alive: ${u.alive ? 'true' : 'false'}`);
      if (u.alive && typeof u.hp === 'number' && typeof u.maxHp === 'number') ctx.log.append(`hp: ${u.hp} / ${u.maxHp}`);
      if (u.position) ctx.log.append(`position: (x=${u.position.x.toFixed(2)}, y=${u.position.y.toFixed(2)}, z=${u.position.z.toFixed(2)})`);
      if (typeof u.yawDeg === 'number') ctx.log.append(`yawDeg: ${u.yawDeg.toFixed(1)}°`);
      if (typeof u.speedMps === 'number') ctx.log.append(`speed: ${u.speedMps.toFixed(2)} m/s`);
      if (typeof u.visionRadius === 'number') ctx.log.append(`visionRadius: ${u.visionRadius.toFixed(1)} m`);
      if (typeof u.weaponRadius === 'number') ctx.log.append(`weaponRadius: ${u.weaponRadius.toFixed(1)} m`);
    },
  });

  defs.push({
    name: 'units_list',
    help: 'List unit IDs and basics: /units_list',
    handler: (_args, ctx) => {
      const inspect = requireInspect(ctx);
      if (!inspect) return;
      const list = inspect.listUnits();
      ctx.log.append(`[Units List] (total: ${list.length})`);
      for (const u of list) {
        const hp = u.alive && typeof u.hp === 'number' && typeof u.maxHp === 'number' ? ` | hp:${u.hp}/${u.maxHp}` : '';
        ctx.log.append(`${u.id} | ${u.kind} | ${u.faction} | ${u.alive ? 'alive' : 'dead'}${hp}`);
      }
    },
  });

  defs.push({
    name: 'unit_info',
    help: 'Show info for a unit: /unit_info <unit_id>',
    handler: (args, ctx) => {
      const inspect = requireInspect(ctx);
      if (!inspect) return;
      const id = String(args[0] ?? '').trim();
      if (!id) {
        ctx.log.append('[debug] usage: /unit_info <unit_id>');
        return;
      }
      const u = inspect.getUnit(id);
      if (!u) {
        ctx.log.append(`[Unit Info] ${id} (not found)`);
        return;
      }
      ctx.log.append(`[Unit Info: ${u.id}]`);
      ctx.log.append(`type: ${u.kind}`);
      ctx.log.append(`faction: ${u.faction}`);
      ctx.log.append(`alive: ${u.alive ? 'true' : 'false'}`);
      if (u.alive && typeof u.hp === 'number' && typeof u.maxHp === 'number') ctx.log.append(`hp: ${u.hp} / ${u.maxHp}`);
      if (u.position) ctx.log.append(`position: (x=${u.position.x.toFixed(2)}, y=${u.position.y.toFixed(2)}, z=${u.position.z.toFixed(2)})`);
      if (typeof u.yawDeg === 'number') ctx.log.append(`yawDeg: ${u.yawDeg.toFixed(1)}°`);
      if (typeof u.speedMps === 'number') ctx.log.append(`speed: ${u.speedMps.toFixed(2)} m/s`);
      if (typeof u.visionRadius === 'number') ctx.log.append(`visionRadius: ${u.visionRadius.toFixed(1)} m`);
      if (typeof u.weaponRadius === 'number') ctx.log.append(`weaponRadius: ${u.weaponRadius.toFixed(1)} m`);
    },
  });

  defs.push({
    name: 'world_info',
    help: 'Show world/runtime summary: /world_info',
    handler: (_args, ctx) => {
      const inspect = requireInspect(ctx);
      if (!inspect) return;
      const w = inspect.getWorldInfo();
      ctx.log.append('[World Info]');
      if (w.mode) ctx.log.append(`mode: ${w.mode}`);
      if (typeof w.executionLocked === 'boolean') ctx.log.append(`executionLocked: ${w.executionLocked}`);
      if (typeof w.prepareDurationSec === 'number') ctx.log.append(`prepareDurationSec: ${w.prepareDurationSec}`);
      if (typeof w.execT === 'number') ctx.log.append(`execT: ${w.execT.toFixed(2)} s`);
      if (typeof w.execFrameCount === 'number') ctx.log.append(`execFrames: ${w.execFrameCount}`);
      if (typeof w.markerCount === 'number') ctx.log.append(`markers: ${w.markerCount}`);
      ctx.log.append(`units: ${w.unitCount ?? 0} enemies: ${w.enemyCount ?? 0} buildings: ${w.buildingCount ?? 0}`);
    },
  });

  return new Map(defs.map((d) => [d.name, d]));
}
