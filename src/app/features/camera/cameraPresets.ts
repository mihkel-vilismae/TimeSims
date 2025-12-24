import * as THREE from 'three';

export type CameraPresetId = 'TOP' | 'ISOMETRIC' | 'FREE';

export type CameraPreset = {
  id: CameraPresetId;
  label: string;
  description: string;

  /** Optional camera position. If omitted, the preset does not move the camera. */
  position?: { x: number; y: number; z: number };

  /** Optional look target. If omitted, the preset does not change camera orientation. */
  target?: { x: number; y: number; z: number };

  /** Optional up vector. Useful for top-down orientation. */
  up?: { x: number; y: number; z: number };

  /** Optional field of view override. */
  fov?: number;
};

export const CAMERA_PRESETS: readonly CameraPreset[] = Object.freeze([
  Object.freeze({
    id: 'ISOMETRIC',
    label: 'Isometric',
    description: 'Default angled view (balanced overview).',
    position: { x: 26, y: 22, z: 26 },
    target: { x: 0, y: 0, z: 0 },
  }),
  Object.freeze({
    id: 'TOP',
    label: 'Top',
    description: 'Top-down tactical view.',
    position: { x: 0, y: 60, z: 0 },
    target: { x: 0, y: 0, z: 0 },

    // Keep a deterministic compass-like orientation: +Z points up on screen.
    up: { x: 0, y: 0, z: -1 },
    fov: 55,
  }),
  Object.freeze({
    id: 'FREE',
    label: 'Free',
    description: 'Do not move camera; intended for manual controls.',
  }),
]);

export function getCameraPreset(id: CameraPresetId): CameraPreset {
  const found = CAMERA_PRESETS.find((p) => p.id === id);
  if (!found) {
    // Exhaustive safety: keep deterministic fallback.
    return CAMERA_PRESETS[0];
  }
  return found;
}

export function applyCameraPreset(camera: THREE.PerspectiveCamera, preset: CameraPreset): void {
  if (preset.fov != null && camera.fov !== preset.fov) {
    camera.fov = preset.fov;
    camera.updateProjectionMatrix();
  }

  if (preset.up) {
    camera.up.set(preset.up.x, preset.up.y, preset.up.z);
  }

  if (preset.position) {
    camera.position.set(preset.position.x, preset.position.y, preset.position.z);
  }

  if (preset.target) {
    camera.lookAt(preset.target.x, preset.target.y, preset.target.z);
  }

  camera.updateMatrixWorld();
}
