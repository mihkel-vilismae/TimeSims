import { renderContextMenu } from '../systems/contextMenuSystem';import type { AppRuntime } from './createRuntime';
import { DEFAULT_DT_SEC, DEFAULT_PREPARE_DURATION_SEC } from '../../timesims/config/simConfig';
import { simulatePlanning } from '../../timesims/core/simulation';

function findFrameIndex(frames: { t: number }[], t: number): number {
  // Return last frame with time <= t.
  let lo = 0;
  let hi = frames.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans < 0 ? 0 : ans;
}

export function stepRuntime(rt: AppRuntime, nowMs: number): void {
  const dtSec = Math.max(0, (nowMs - rt.lastFrameMs) / 1000);
  rt.lastFrameMs = nowMs;

  // Render context menu
  const menuDom = (rt as any)._menuDom;
  const onMenuCommand = (rt as any)._onMenuCommand;
  if (menuDom && onMenuCommand) {
    renderContextMenu({ dom: menuDom, state: rt.ui.menu, onCommand: onMenuCommand });
  }

  // Planning: recompute markers when dirty (cheap world sizes).
  if (rt.rt.mode === 'planning' && rt.dirtyPlan) {
    const prepareDuration = Number(rt.prepareInput.value) || DEFAULT_PREPARE_DURATION_SEC;
    const simWorld = {
      units: rt.world.units.map((u) => ({
        id: u.id,
        pos: { x: u.mesh.position.x, z: u.mesh.position.z },
        visionRadius: u.vision.radius,
        speed: u.moveSpeed?.metersPerSecond ?? 0,
        plan: rt.plans[u.id] ?? { commands: [] },
      })),
      enemies: rt.world.enemies.map((e) => ({ id: e.id, pos: { x: e.mesh.position.x, z: e.mesh.position.z } })),
      buildings: rt.world.buildings.filter((b) => b.blocksLOS).map((b) => ({ pos: { x: b.mesh.position.x, z: b.mesh.position.z }, radius: 3 })),
      smokes: [],
    };
    const planned = simulatePlanning(simWorld, { dt: DEFAULT_DT_SEC, prepareDuration });
    rt.markers = planned.markers;
    rt.markersEl.innerHTML = planned.markers
      .map((m) => `<div class="marker"><span class="t">t=${m.t.toFixed(1)}</span> <span class="k">${m.kind}</span> <span class="m">${m.message}</span></div>`)
      .join('');
    rt.dirtyPlan = false;
  }

  // Execution playback: advance time and apply frame positions.
  if (rt.rt.mode === 'executing' && rt.execFrames.length > 0) {
    rt.execT += dtSec;
    const idx = findFrameIndex(rt.execFrames, rt.execT);
    const frame = rt.execFrames[idx];
    for (const u of rt.world.units) {
      const pos = frame.units[u.id];
      if (!pos) continue;
      u.mesh.position.x = pos.x;
      u.mesh.position.z = pos.z;
    }
  }

  rt.composer.render();
}
