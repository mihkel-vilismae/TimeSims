import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type OrbitControlsController = {
  isSupported(): boolean;
  isEnabled(): boolean;
  enable(): void;
  disable(): void;
  toggle(): void;
  /** Must be called once per frame (safe even when disabled). */
  update(): void;
  dispose(): void;
  /** Subscribe to enabled/disabled changes. Returns unsubscribe. */
  subscribe(fn: (enabled: boolean) => void): () => void;
};

export type CreateOrbitControlsControllerArgs = {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  /** Initial enabled state. Defaults to false. */
  enabled?: boolean;
};

export function createOrbitControlsController(args: CreateOrbitControlsControllerArgs): OrbitControlsController {
  // OrbitControls requires DOM + PointerEvents; treat as optional.
  const supported = !!args.domElement;

  let controls: OrbitControls | null = null;
  let enabled = false;
  const listeners = new Set<(enabled: boolean) => void>();

  function emit(): void {
    listeners.forEach((fn) => fn(enabled));
  }

  function configure(c: OrbitControls): void {
    // Avoid fighting with selection (left-click) and context menu (right-click).
    // - Left: PAN but pan disabled -> OrbitControls won't consume left clicks.
    // - Middle: ROTATE
    // - Right: PAN but pan disabled -> won't consume right-click.
    c.enablePan = false;
    c.enableRotate = true;
    c.enableZoom = true;

    // Damping gives smoother feel without impacting determinism (purely view).
    c.enableDamping = true;
    c.dampingFactor = 0.08;

    c.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN,
    };

    // Keep the same target behavior as our presets (default origin).
    // Users can pan later when we intentionally add it.
    c.target.set(0, 0, 0);
    c.update();
  }

  function ensureEnabled(next: boolean): void {
    if (!supported) return;
    if (enabled === next) return;
    enabled = next;

    if (enabled) {
      controls = new OrbitControls(args.camera, args.domElement);
      configure(controls);
    } else {
      controls?.dispose();
      controls = null;
    }

    emit();
  }

  // Apply initial state deterministically.
  ensureEnabled(Boolean(args.enabled));

  return {
    isSupported() {
      return supported;
    },
    isEnabled() {
      return enabled;
    },
    enable() {
      ensureEnabled(true);
    },
    disable() {
      ensureEnabled(false);
    },
    toggle() {
      ensureEnabled(!enabled);
    },
    update() {
      // OrbitControls only needs updating for damping.
      controls?.update();
    },
    dispose() {
      ensureEnabled(false);
      listeners.clear();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
