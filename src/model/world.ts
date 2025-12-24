import type { TimelinePlan } from './commands';
import type { Smoke } from './components';

export type WorldPos2 = { x: number; z: number };

export type SimUnit = {
  id: string;
  pos: WorldPos2;
  visionRadius: number;
  plan: TimelinePlan;
  speed: number;
};

export type SimEnemy = { id: string; pos: WorldPos2 };
export type BuildingOccluder = { pos: WorldPos2; radius: number };

export type SimWorld = {
  units: SimUnit[];
  enemies: SimEnemy[];
  buildings: BuildingOccluder[];
  smokes: Smoke[];
};
