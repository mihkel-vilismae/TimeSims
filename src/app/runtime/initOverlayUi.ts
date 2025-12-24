import { createOverlayRoot, ensureOverlayStyles, createDebugLog } from '../../adapters/uiOverlay';
import { createDebugSettingsStore, type DebugSettingsStore } from '../state/debugSettings';
import { createDebugCommandRunner, type DebugCommandRunner } from '../systems/debugCommands/runDebugCommand';
import { createDebugPanel } from '../../adapters/uiOverlay/panels/DebugPanel';
import type { DebugLogPort } from '../../adapters/uiOverlay/DebugLog';

export type OverlayUi = {
  log: DebugLogPort;
  settings: DebugSettingsStore;
  runner: DebugCommandRunner;
  dispose(): void;
};

export function initOverlayUi(): OverlayUi {
  ensureOverlayStyles();
  const root = createOverlayRoot('ui-overlay-root');

  const log = createDebugLog(500);
  const settings = createDebugSettingsStore({ enabled: true, verbose: false, categories: { ui: true } });
  const runner = createDebugCommandRunner({ log, settings });

  const debugPanel = createDebugPanel({ log, settings, runner });
  debugPanel.window.mount(root);

  // Start with a hint
  log.append('[debug] type /help');

  return {
    log,
    settings,
    runner,
    dispose() {
      debugPanel.dispose();
    },
  };
}
