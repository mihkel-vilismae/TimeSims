import { distance } from './geom';
import { computeLOS, Occluder } from './los';
import type { TimelineCommand, MoveCommand, TimelineMarker } from '../../model/commands';
import type { Smoke } from '../../model/components';
import type { SimEnemy, SimUnit } from '../../model/world';

export type DetectionPairState = { lastLOS: boolean; lastDetected: boolean };
export type DetectionState = Record<string, Record<string, DetectionPairState>>;

/**
 * Returns the command that is active at time t.
 * If multiple commands overlap, the earliest-starting active command wins.
 */
export function evaluateActiveCommand(
  commands: TimelineCommand[],
  t: number
): TimelineCommand | null {
  let active: TimelineCommand | null = null;
  for (const c of commands) {
    if (t >= c.startTime && t < c.startTime + c.duration) {
      if (active == null || c.startTime < active.startTime) active = c;
    }
  }
  return active;
}

export type StepSimArgs = {
  t: number;
  dt: number;
  units: SimUnit[];
  enemies: SimEnemy[];
  buildings: Occluder[];
  smokes: Smoke[];
  markers: TimelineMarker[];
  detectionState: DetectionState;
  interrupted: Record<string, boolean>;
};

/**
 * Advance the simulation by a single fixed time step.
 * Mutates the provided state arrays/maps (units, detectionState, interrupted, markers).
 *
 * Returns a snapshot of unit positions for UI/preview rendering.
 */
export function stepSim(args: StepSimArgs): { units: Record<string, { x: number; z: number }> } {
  const { t, dt, units, enemies, buildings, smokes, markers, detectionState, interrupted } = args;

  // Update unit positions.
  for (const unit of units) {
    if (interrupted[unit.id]) continue;
    const active = evaluateActiveCommand(unit.plan.commands, t);
    if (active && (active as MoveCommand).kind === 'move') {
      const mv = active as MoveCommand;
      const dx = mv.direction.x;
      const dz = mv.direction.z;
      const len = Math.hypot(dx, dz);
      const nx = len > 0 ? dx / len : 0;
      const nz = len > 0 ? dz / len : 0;
      unit.pos.x += nx * unit.speed * dt;
      unit.pos.z += nz * unit.speed * dt;
    }
  }

  // Perception check for each unit/enemy pair.
  for (const unit of units) {
    for (const enemy of enemies) {
      const state = detectionState[unit.id][enemy.id];
      const d = distance(unit.pos, enemy.pos);
      const hasLOS = computeLOS(unit.pos, enemy.pos, buildings, smokes, t);
      const detected = d <= unit.visionRadius && hasLOS;

      if (hasLOS !== state.lastLOS) {
        markers.push({
          t,
          kind: 'los',
          message: `${unit.id}:${enemy.id} los ${hasLOS ? 'true' : 'false'}`
        });
        state.lastLOS = hasLOS;
      }

      if (detected && !state.lastDetected) {
        markers.push({
          t,
          kind: 'detection',
          message: `${unit.id} detected ${enemy.id}`
        });

        const active = evaluateActiveCommand(unit.plan.commands, t);
        if (active && (active as MoveCommand).kind === 'move' && !interrupted[unit.id]) {
          markers.push({
            t,
            kind: 'interrupt',
            message: `${unit.id} interrupted movement due to detection`
          });
          interrupted[unit.id] = true;
        }

        state.lastDetected = true;
      }

      if (!detected && state.lastDetected) {
        state.lastDetected = false;
      }
    }
  }

  // Snapshot positions for visualization.
  const snapshot: Record<string, { x: number; z: number }> = {};
  for (const unit of units) snapshot[unit.id] = { x: unit.pos.x, z: unit.pos.z };
  return { units: snapshot };
}
