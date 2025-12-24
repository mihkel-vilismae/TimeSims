import * as THREE from 'three';
import type { Camera, Raycaster, Vector2 } from 'three';

import type { RuntimeWorld } from '../entities/runtimeEntities';
import type { UiState } from '../state/uiState';

export function pickUnitIdAtClient(params: {
  clientX: number;
  clientY: number;
  rendererDom: HTMLElement;
  camera: Camera;
  raycaster: Raycaster;
  ndc: Vector2;
  world: RuntimeWorld;
}): string | null {
  const { clientX, clientY, rendererDom, camera, raycaster, ndc, world } = params;
  const rect = rendererDom.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(ndc, camera);
  const candidates: THREE.Object3D[] = [];
  for (const u of world.units) candidates.push(u.mesh);
  const hits = raycaster.intersectObjects(candidates, true);
  if (hits.length === 0) return null;
  const hitObj = hits[0]?.object;
  if (!hitObj) return null;

  // Walk up to the root mesh in case we hit a child.
  const root = world.units.find((u) => u.mesh === hitObj || u.mesh.children.includes(hitObj) || u.mesh.getObjectById(hitObj.id) !== undefined);
  return root?.id ?? null;
}

export function applySelectionHighlight(params: {
  ui: UiState;
  world: RuntimeWorld;
}): void {
  const { ui, world } = params;
  for (const u of world.units) {
    const isSel = ui.selectedUnitId === u.id;
    u.selectionRing.visible = isSel;
  }
}
