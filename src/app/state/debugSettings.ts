export type DebugSettings = {
  /** Master switch for debug output. */
  enabled: boolean;
  /** Extra noisy logging across systems. */
  verbose: boolean;
  /** Optional per-category toggles (e.g. 'ui', 'input', 'los'). */
  categories: Record<string, boolean>;
};

export type DebugSettingsPatch = Partial<Omit<DebugSettings, 'categories'>> & {
  categories?: Record<string, boolean>;
};

export type DebugSettingsSubscriber = (next: DebugSettings) => void;

export type DebugSettingsStore = {
  get(): DebugSettings;
  patch(p: DebugSettingsPatch): DebugSettings;
  subscribe(fn: DebugSettingsSubscriber): () => void;
};

export function createDebugSettingsStore(initial?: Partial<DebugSettings>): DebugSettingsStore {
  let cur: DebugSettings = {
    enabled: initial?.enabled ?? true,
    verbose: initial?.verbose ?? false,
    categories: initial?.categories ? { ...initial.categories } : {},
  };

  const subs = new Set<DebugSettingsSubscriber>();

  function emit(): void {
    for (const fn of subs) fn(cur);
  }

  return {
    get() {
      return cur;
    },

    patch(p: DebugSettingsPatch) {
      cur = {
        ...cur,
        ...p,
        categories: p.categories ? { ...cur.categories, ...p.categories } : cur.categories,
      };
      emit();
      return cur;
    },

    subscribe(fn: DebugSettingsSubscriber) {
      subs.add(fn);
      // Fire immediately so UI can render initial state.
      fn(cur);
      return () => {
        subs.delete(fn);
      };
    },
  };
}
