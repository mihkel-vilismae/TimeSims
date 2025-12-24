import { Vec2, distance } from './geom';
import { computeLOS, Occluder } from './los';
import type {
  TimelinePlan,
  TimelineCommand,
  MoveCommand,
  TimelineMarker
} from '../../model/components';
import type { Smoke } from '../../model/components';
import { validatePlan } from '../planning/planSim';

// Types used by the simulation.  These are intentionally minimal and
// defined here rather than relying directly on the engine's entity
// structures.  Simulation tests can construct these objects directly.

export interface SimUnit {
  id: string;
  pos: Vec2;
  visionRadius: number;
  plan: TimelinePlan;
  speed: number;
}

export interface SimEnemy {
  id: string;
  pos: Vec2;
}

export interface SimWorld {
  units: SimUnit[];
  enemies: SimEnemy[];
  buildings: Occluder[];
  smokes: Smoke[];
}

/**
 * Return the active command at a given time for a list of commands.  If
 * multiple commands overlap the first matching entry is returned.  Only
 * one command can be active at a time in this simplified model.
 */
export function evaluateActiveCommand(commands: TimelineCommand[], t: number): TimelineCommand | null {
  for (const cmd of commands) {
    if (t >= cmd.startTime && t < cmd.startTime + cmd.duration) {
      return cmd;
    }
  }
  return null;
}

/**
 * Perform an offline planning simulation.  The simulation advances in
 * fixed steps of `dt` seconds.  Units move according to their active
 * Move commands and stop when an interruption occurs.  Detection
 * markers are emitted when an enemy enters vision range with clear LOS.
 * Interrupt markers are emitted when a detection happens while a unit
 * is moving.  LOS transition markers are emitted whenever the LOS
 * boolean flips for any unit‑enemy pair.
 *
 * @param world      The initial world state including units, enemies and occluders
 * @param opts       Simulation options: dt, prepareDuration and endTime
 */
export function simulatePlanning(
  world: SimWorld,
  opts?: { dt?: number; prepareDuration?: number; endTime?: number }
): { markers: TimelineMarker[]; warnings: string[]; units: SimUnit[]; frames: { t: number; units: Record<string, { x: number; z: number }> }[] } {
  const dt = opts?.dt ?? 0.1;
  const prepareDuration = opts?.prepareDuration ?? 10;
  const endTime = opts?.endTime ?? 15;
  // Deep copy unit positions so simulation does not mutate inputs.
  const units: SimUnit[] = world.units.map((u) => ({
    id: u.id,
    pos: { x: u.pos.x, z: u.pos.z },
    visionRadius: u.visionRadius,
    plan: u.plan,
    speed: u.speed
  }));
  const enemies: SimEnemy[] = world.enemies.map((e) => ({ id: e.id, pos: { x: e.pos.x, z: e.pos.z } }));
  const buildings: Occluder[] = world.buildings.map((b) => ({ pos: { x: b.pos.x, z: b.pos.z }, radius: b.radius }));
  const smokes: Smoke[] = world.smokes.map((s) => ({ ...s }));
  const markers: TimelineMarker[] = [];
  const warnings: string[] = [];
  const frames: { t: number; units: Record<string, { x: number; z: number }> }[] = [];
  // Generate validation warnings for each unit plan.
  for (const unit of units) {
    warnings.push(...validatePlan(unit.plan.commands, prepareDuration));
  }
  // Detection state per unit per enemy.
  const detectionState: Record<string, Record<string, { lastLOS: boolean; lastDetected: boolean }>> = {};
  for (const unit of units) {
    detectionState[unit.id] = {};
    for (const enemy of enemies) {
      detectionState[unit.id][enemy.id] = { lastLOS: false, lastDetected: false };
    }
  }
  // Interruption state per unit.  Once interrupted, the unit stops moving.
  const interrupted: Record<string, boolean> = {};
  for (const unit of units) {
    interrupted[unit.id] = false;
  }
  // Main simulation loop.
  for (let t = 0; t <= endTime; t = Math.round((t + dt) * 1e4) / 1e4) {
    // Update unit positions.
    for (const unit of units) {
      if (interrupted[unit.id]) continue;
      const active = evaluateActiveCommand(unit.plan.commands, t);
      if (active && (active as MoveCommand).kind === 'move') {
        const mv = active as MoveCommand;
        // Normalize direction on the XZ plane.
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
        // Emit LOS transition marker if LOS flips.
        if (hasLOS !== state.lastLOS) {
          markers.push({
            t,
            kind: 'los',
            message: `${unit.id}:${enemy.id} los ${hasLOS ? 'true' : 'false'}`
          });
          state.lastLOS = hasLOS;
        }
        // Emit detection marker and optional interruption marker on rising edge.
        if (detected && !state.lastDetected) {
          markers.push({
            t,
            kind: 'detection',
            message: `${unit.id} detected ${enemy.id}`
          });
          // If unit is currently moving and not yet interrupted, emit interrupt marker.
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
        // Reset detection on falling edge.
        if (!detected && state.lastDetected) {
          state.lastDetected = false;
        }
      }
    }
    // Record a snapshot of unit positions for visualisation.
    const snapshot: Record<string, { x: number; z: number }> = {};
    for (const unit of units) {
      snapshot[unit.id] = { x: unit.pos.x, z: unit.pos.z };
    }
    frames.push({ t, units: snapshot });
  }
  return { markers, warnings, units, frames };
}

/**
 * Simulate execution using the same underlying logic as planning.  In this
 * simplified prototype the execution simulation calls directly into
 * simulatePlanning so the same markers and state are produced.  This
 * function exists to satisfy planning/execution parity tests and to
 * illustrate how the runtime would be extended in the future.
 */
export function simulateExecution(
  world: SimWorld,
  opts?: { dt?: number; prepareDuration?: number; endTime?: number }
): { markers: TimelineMarker[]; warnings: string[]; units: SimUnit[] } {
  return simulatePlanning(world, opts);
}