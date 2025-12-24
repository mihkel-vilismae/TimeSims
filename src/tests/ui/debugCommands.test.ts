import { describe, expect, it } from 'vitest';

import { createDebugLog } from '../../adapters/uiOverlay';
import { createDebugSettingsStore } from '../../app/state/debugSettings';
import { createDebugCommandRunner } from '../../app/systems/debugCommands/runDebugCommand';

describe('debug command runner', () => {
  it('toggles verbose via /verbose on/off/toggle', () => {
    const log = createDebugLog(50);
    const settings = createDebugSettingsStore({ verbose: false });
    const runner = createDebugCommandRunner({ log, settings });

    runner.run('/verbose on');
    expect(settings.get().verbose).toBe(true);

    runner.run('/verbose off');
    expect(settings.get().verbose).toBe(false);

    runner.run('/verbose toggle');
    expect(settings.get().verbose).toBe(true);
  });

  it('supports category toggles and listing', () => {
    const log = createDebugLog(200);
    const settings = createDebugSettingsStore({ categories: { ui: true } });
    const runner = createDebugCommandRunner({ log, settings });

    runner.run('/cat input on');
    expect(settings.get().categories).toEqual({ ui: true, input: true });

    runner.run('/cat ui off');
    expect(settings.get().categories).toEqual({ ui: false, input: true });

    runner.run('/cats');
    const text = log.getLines().map((l) => l.text).join('\n');
    expect(text).toContain('categories:');
    expect(text).toContain('input=on');
  });

  it('treats non-command lines as user notes', () => {
    const log = createDebugLog(10);
    const settings = createDebugSettingsStore();
    const runner = createDebugCommandRunner({ log, settings });

    runner.run('hello world');
    expect(log.getLines().some((l) => l.text.includes('[user] hello world'))).toBe(true);
  });

  it('supports unit/world info commands when inspector is attached', () => {
    const log = createDebugLog(200);
    const settings = createDebugSettingsStore();
    const runner = createDebugCommandRunner({ log, settings });

    runner.setInspect({
      getActiveUnitId: () => 'u1',
      listUnits: () => [
        { id: 'u1', kind: 'tank', faction: 'player', alive: true, hp: 50, maxHp: 100 },
        { id: 'e1', kind: 'enemy', faction: 'enemy', alive: true, hp: 60, maxHp: 60 },
      ],
      getUnit: (id: string) =>
        id === 'u1'
          ? {
              id: 'u1',
              kind: 'tank',
              faction: 'player',
              alive: true,
              hp: 50,
              maxHp: 100,
              position: { x: 1, y: 0, z: 2 },
              yawDeg: 90,
              speedMps: 3,
              visionRadius: 10,
              weaponRadius: 8,
            }
          : null,
      getWorldInfo: () => ({ mode: 'planning', executionLocked: false, unitCount: 1, enemyCount: 1, buildingCount: 0, markerCount: 3 }),
    });

    runner.run('/active_unit_info');
    runner.run('/units_list');
    runner.run('/unit_info u1');
    runner.run('/world_info');

    const text = log.getLines().map((l) => l.text).join('\n');
    expect(text).toContain('[Active Unit]');
    expect(text).toContain('id: u1');
    expect(text).toContain('[Units List]');
    expect(text).toContain('u1 | tank');
    expect(text).toContain('[Unit Info: u1]');
    expect(text).toContain('[World Info]');
    expect(text).toContain('mode: planning');
  });

  it('prints a helpful message when info commands are used without an inspector', () => {
    const log = createDebugLog(50);
    const settings = createDebugSettingsStore();
    const runner = createDebugCommandRunner({ log, settings });

    runner.run('/world_info');
    const text = log.getLines().map((l) => l.text).join('\n');
    expect(text).toContain('inspector');
  });
});
