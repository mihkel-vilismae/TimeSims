import * as THREE from 'three';

import type { CameraPresetId } from './cameraPresets';
import { CAMERA_PRESETS, applyCameraPreset, getCameraPreset } from './cameraPresets';

export type CameraPresetController = {
  listPresets(): readonly { id: CameraPresetId; label: string; description: string }[];
  getActive(): CameraPresetId;
  apply(id: CameraPresetId): void;
  subscribe(fn: (id: CameraPresetId) => void): () => void;
};

export type CreateCameraPresetControllerArgs = {
  camera: THREE.PerspectiveCamera;
  defaultPreset?: CameraPresetId;
};

export function createCameraPresetController(args: CreateCameraPresetControllerArgs): CameraPresetController {
  const defaultPreset = args.defaultPreset ?? 'ISOMETRIC';
  let active: CameraPresetId = defaultPreset;
  const listeners = new Set<(id: CameraPresetId) => void>();

  // Apply default deterministically.
  applyCameraPreset(args.camera, getCameraPreset(defaultPreset));

  function emit(): void {
    listeners.forEach((fn) => fn(active));
  }

  return {
    listPresets() {
      return CAMERA_PRESETS.map((p) => ({ id: p.id, label: p.label, description: p.description }));
    },
    getActive() {
      return active;
    },
    apply(id) {
      const preset = getCameraPreset(id);
      if (active === preset.id) return;
      active = preset.id;
      applyCameraPreset(args.camera, preset);
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
