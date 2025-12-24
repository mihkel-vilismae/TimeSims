import type { TimelineMarker } from '../../model/components';
import type { SimWorld, SimUnit } from '../core/simulation';
import { simulatePlanning } from '../core/simulation';

export type PreviewFrame = { t: number; units: Record<string, { x: number; z: number }> };

/**
 * UI-side helper that projects a timeline plan onto the world to produce
 * non-authoritative preview frames and markers.
 *
 * This function MUST NOT mutate the provided world or any TimelinePlan.
 */
export function projectPreview(
  world: SimWorld,
  opts?: { dt?: number; prepareDuration?: number; endTime?: number }
): { markers: TimelineMarker[]; warnings: string[]; units: SimUnit[]; frames: PreviewFrame[] } {
  return simulatePlanning(world, opts);
}
