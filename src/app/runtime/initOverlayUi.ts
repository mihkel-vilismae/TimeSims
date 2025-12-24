import { createOverlayRoot, ensureOverlayStyles, createDebugLog } from '../../adapters/uiOverlay';
import { createDebugSettingsStore, type DebugSettingsStore } from '../state/debugSettings';
import { createDebugCommandRunner, type DebugCommandRunner } from '../systems/debugCommands/runDebugCommand';
import { createDebugPanel } from '../../adapters/uiOverlay/panels/DebugPanel';
import { createCameraPresetsPanel } from '../../adapters/uiOverlay/panels/CameraPresetsPanel';
import { createOrbitControlsPanel } from '../../adapters/uiOverlay/panels/OrbitControlsPanel';
import type { DebugLogPort } from '../../adapters/uiOverlay/DebugLog';
import type { CameraPresetController } from '../features/camera/cameraPresetController';
import type { OrbitControlsController } from '../features/camera/orbitControlsController';

export type OverlayUi = {
  log: DebugLogPort;
  settings: DebugSettingsStore;
  runner: DebugCommandRunner;
  cameraPresets?: CameraPresetController;
  orbitControls?: OrbitControlsController;
  dispose(): void;
};

export type InitOverlayUiArgs = {
  cameraPresets?: CameraPresetController;
  orbitControls?: OrbitControlsController;
};

export function initOverlayUi(args: InitOverlayUiArgs = {}): OverlayUi {
  ensureOverlayStyles();
  const root = createOverlayRoot('ui-overlay-root');

  const log = createDebugLog(500);
  const settings = createDebugSettingsStore({ enabled: true, verbose: false, categories: { ui: true } });
  const runner = createDebugCommandRunner({ log, settings });

  const debugPanel = createDebugPanel({ log, settings, runner });
  debugPanel.window.mount(root);

  const cameraPanel = args.cameraPresets ? createCameraPresetsPanel({ controller: args.cameraPresets }) : null;
  cameraPanel?.window.mount(root);

  const orbitPanel = args.orbitControls ? createOrbitControlsPanel({ controller: args.orbitControls }) : null;
  orbitPanel?.window.mount(root);

  // Start with a hint
  log.append('[debug] type /help');

  return {
    log,
    settings,
    runner,
    cameraPresets: args.cameraPresets,
    orbitControls: args.orbitControls,
    dispose() {
      debugPanel.dispose();
      cameraPanel?.dispose();
      orbitPanel?.dispose();
    },
  };
}
