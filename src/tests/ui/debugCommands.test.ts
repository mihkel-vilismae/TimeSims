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
});
