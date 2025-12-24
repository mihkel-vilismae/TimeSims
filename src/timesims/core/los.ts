import type { Smoke } from '../../model/components';
import { Vec2, lineSegmentIntersectsCircle } from './geom';

// Simplified representation for static occluders (buildings) in LOS
// computations.  Each occluder has a position and a radius.  LOS
// calculations ignore any `blocksLOS` flag here because only
// occluders passed to computeLOS are considered.
export interface Occluder {
  pos: Vec2;
  radius: number;
}

/**
 * Compute line‑of‑sight from a unit to an enemy at a given time.  The
 * function returns true if the straight line between `unit` and `enemy`
 * is not blocked by any building or active smoke volume.  The positions
 * are projected onto the XZ plane; the Y component is ignored.
 *
 * @param unit    Position of the unit
 * @param enemy   Position of the enemy
 * @param buildings  Array of static occluders (e.g. buildings) with radii
 * @param smokes     Array of smoke volumes (with start/end times and radius)
 * @param t          Current simulation time (seconds)
 */
export function computeLOS(
  unit: Vec2,
  enemy: Vec2,
  buildings: Occluder[],
  smokes: Smoke[],
  t: number
): boolean {
  // Check buildings first.
  for (const oc of buildings) {
    if (lineSegmentIntersectsCircle(unit, enemy, oc.pos, oc.radius)) {
      return false;
    }
  }
  // Check active smoke volumes.
  for (const smoke of smokes) {
    if (t < smoke.startTime || t > smoke.endTime) continue;
    if (lineSegmentIntersectsCircle(unit, enemy, smoke.pos, smoke.radius)) {
      return false;
    }
  }
  return true;
}