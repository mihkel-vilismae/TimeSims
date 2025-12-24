import { describe, expect, it } from 'vitest';
import { createDebugSettingsStore } from '../../app/state/debugSettings';

describe('debugSettings store', () => {
  it('patch updates enabled/verbose and notifies subscribers', () => {
    const store = createDebugSettingsStore({ enabled: true, verbose: false });

    const seen: Array<{ enabled: boolean; verbose: boolean }> = [];
    const unsub = store.subscribe((s) => seen.push({ enabled: s.enabled, verbose: s.verbose }));

    // subscribe fires immediately
    expect(seen).toEqual([{ enabled: true, verbose: false }]);

    store.patch({ verbose: true });
    store.patch({ enabled: false });

    expect(seen[seen.length - 1]).toEqual({ enabled: false, verbose: true });
    unsub();

    store.patch({ enabled: true });
    // no more notifications
    expect(seen[seen.length - 1]).toEqual({ enabled: false, verbose: true });
  });

  it('patch merges categories without deleting others', () => {
    const store = createDebugSettingsStore({ categories: { ui: true } });
    store.patch({ categories: { input: true } });
    expect(store.get().categories).toEqual({ ui: true, input: true });
    store.patch({ categories: { ui: false } });
    expect(store.get().categories).toEqual({ ui: false, input: true });
  });
});
