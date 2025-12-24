import type { AppRuntime } from './createRuntime';
import type {
  DebugInspectPort,
  DebugUnitDetail,
  DebugUnitSummary,
  DebugWorldInfo,
} from '../systems/debugCommands/debugCommandRegistry';

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

function safeNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function toSummary(u: {
  id: string;
  kind?: string;
  faction?: { kind: string };
  health?: { hp: number; maxHp: number };
}): DebugUnitSummary {
  const alive = u.health ? u.health.hp > 0 : true;
  return {
    id: u.id,
    kind: String((u as any).kind ?? 'unit'),
    faction: String(u.faction?.kind ?? 'unknown'),
    alive,
    hp: u.health?.hp,
    maxHp: u.health?.maxHp,
  };
}

function toDetail(u: any): DebugUnitDetail {
  const s = toSummary(u);
  const mesh = u.mesh as any;
  const yawDeg = safeNumber(mesh?.rotation?.y) != null ? radToDeg(mesh.rotation.y) : undefined;
  const position = mesh?.position
    ? { x: Number(mesh.position.x) || 0, y: Number(mesh.position.y) || 0, z: Number(mesh.position.z) || 0 }
    : undefined;

  return {
    ...s,
    position,
    yawDeg,
    speedMps: u.moveSpeed?.metersPerSecond,
    visionRadius: u.vision?.radius,
    weaponRadius: u.weapon?.fireRadius,
  };
}

export function createDebugInspector(rt: AppRuntime): DebugInspectPort {
  return {
    getActiveUnitId(): string | null {
      return rt.ui.selectedUnitId ?? null;
    },

    listUnits(): DebugUnitSummary[] {
      const units = rt.world.units.map((u) => toSummary(u));
      const enemies = rt.world.enemies.map((e) => ({ ...toSummary({ ...e, kind: 'enemy' }), kind: 'enemy' }));
      return [...units, ...enemies].sort((a, b) => a.id.localeCompare(b.id));
    },

    getUnit(id: string): DebugUnitDetail | null {
      const u = rt.world.units.find((x) => x.id === id);
      if (u) return toDetail(u);
      const e = rt.world.enemies.find((x) => x.id === id);
      if (e) return toDetail({ ...e, kind: 'enemy' });
      return null;
    },

    getWorldInfo(): DebugWorldInfo {
      return {
        mode: rt.rt.mode,
        executionLocked: rt.rt.executionLocked,
        markerCount: rt.markers.length,
        execFrameCount: rt.execFrames.length,
        execT: rt.execT,
        prepareDurationSec: Number(rt.prepareInput.value) || undefined,
        unitCount: rt.world.units.length,
        enemyCount: rt.world.enemies.length,
        buildingCount: rt.world.buildings.length,
      };
    },
  };
}
