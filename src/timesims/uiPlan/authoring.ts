import type { DeploySmokeCommand, MoveCommand, TimelinePlan } from '../../model/components';
import type { Vec3 } from '../core/math';

export type UnitKind = 'infantry' | 'tank' | 'ifv' | 'bunker';

export type AuthoringErrorCode =
  | 'E_UNIT_CANNOT_MOVE'
  | 'E_UNIT_CANNOT_SMOKE'
  | 'E_INVALID_START_TIME'
  | 'E_INVALID_DURATION'
  | 'E_INVALID_SPEED';

export type AuthoringOk<TCommand> = { ok: true; nextPlan: TimelinePlan; command: TCommand };
export type AuthoringErr = { ok: false; code: AuthoringErrorCode };
export type AuthoringResult<TCommand> = AuthoringOk<TCommand> | AuthoringErr;

function isFiniteNonNeg(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

function distanceXZ(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function quantizeToDtCeil(value: number, dt: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(dt) || dt <= 0) return value;
  const steps = Math.ceil(value / dt);
  // Match the core sim's "round-to-1e4" style quantization so time values are stable.
  const q = steps * dt;
  return Math.round(q * 1e4) / 1e4;
}

function stableCmdId(plan: TimelinePlan, unitId: string, kind: string, startTime: number): string {
  const n = plan.commands.length;
  return `${unitId}:${kind}:${startTime.toFixed(3)}:${n}`;
}

export function authorMoveCommand(args: {
  plan: TimelinePlan;
  unitId: string;
  unitKind: UnitKind;
  moveSpeed: number;
  startTime: number;
  fromPos: Vec3;
  toPos: Vec3;
  dt: number;
}): AuthoringResult<MoveCommand> {
  const { plan, unitId, unitKind, moveSpeed, startTime, fromPos, toPos, dt } = args;

  if (!isFiniteNonNeg(startTime)) return { ok: false, code: 'E_INVALID_START_TIME' };
  if (!Number.isFinite(moveSpeed) || moveSpeed <= 0) return { ok: false, code: 'E_INVALID_SPEED' };
  if (unitKind === 'bunker') return { ok: false, code: 'E_UNIT_CANNOT_MOVE' };

  const dist = distanceXZ(fromPos, toPos);
  const rawDur = dist / moveSpeed;
  const duration = quantizeToDtCeil(rawDur, dt);
  if (!isFiniteNonNeg(duration)) return { ok: false, code: 'E_INVALID_DURATION' };

  const cmd: MoveCommand = {
    id: stableCmdId(plan, unitId, 'move', startTime),
    kind: 'move',
    startTime,
    duration,
    target: { x: toPos.x, y: 0, z: toPos.z },
  };

  return {
    ok: true,
    command: cmd,
    nextPlan: { commands: [...plan.commands, cmd] },
  };
}

export function authorDeploySmokeCommand(args: {
  plan: TimelinePlan;
  unitId: string;
  unitKind: UnitKind;
  startTime: number;
  duration: number;
  radius: number;
  center: Vec3;
  dt: number;
}): AuthoringResult<DeploySmokeCommand> {
  const { plan, unitId, unitKind, startTime, duration, radius, center, dt } = args;

  if (!isFiniteNonNeg(startTime)) return { ok: false, code: 'E_INVALID_START_TIME' };
  if (!isFiniteNonNeg(duration)) return { ok: false, code: 'E_INVALID_DURATION' };
  if (!Number.isFinite(radius) || radius <= 0) return { ok: false, code: 'E_INVALID_DURATION' };
  if (unitKind === 'bunker') return { ok: false, code: 'E_UNIT_CANNOT_SMOKE' };

  const qDur = quantizeToDtCeil(duration, dt);
  const cmd: DeploySmokeCommand = {
    id: stableCmdId(plan, unitId, 'deploySmoke', startTime),
    kind: 'deploySmoke',
    startTime,
    duration: qDur,
    radius,
    center: { x: center.x, y: 0, z: center.z },
  };

  return {
    ok: true,
    command: cmd,
    nextPlan: { commands: [...plan.commands, cmd] },
  };
}
