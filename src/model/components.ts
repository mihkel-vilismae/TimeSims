// Vector in three dimensions.  The game uses a 2D XZ plane for most
// computations but keeps a Y component for completeness.
export type Vec3 = { x: number; y: number; z: number };

// Helper factory for vectors.  Using a function makes it easy to construct
// read‑only objects without repeating field names.
export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

// Position and orientation of an entity.  `pos` is the world position and
// `rot` is Euler rotation in radians on each axis.
export type Transform = { pos: Vec3; rot: Vec3 };

// Linear velocity component.  We keep velocity as a vector rather than
// separate speed/direction fields so we can easily update positions.
export type Velocity = { v: Vec3 };

// Move speed scalar used by runtime entities.
export type MoveSpeed = { speed: number };

// Vision component.  `radius` defines how far the unit can see and
// `losMask` can be used to filter which layers block vision (unused for now).
export type Vision = { radius: number; losMask: number };

// Weapon component.  `fireRadius` defines the maximum firing distance.
// `cooldown` is the rate of fire in seconds.  `suppressionPower` affects
// perception.  `canSmoke` indicates whether this weapon can deploy smoke
// volumes.
export type Weapon = {
  fireRadius: number;
  cooldown: number;
  suppressionPower: number;
  canSmoke: boolean;
};

// Which side an entity belongs to.  Units controlled by the player are
// labelled `player`; enemies are labelled `enemy`.  Buildings and smoke
// volumes do not have a faction.
export type Faction = 'player' | 'enemy';

// Health component for damage and hit points.
export type Health = { hp: number; maxHp: number };

// Cover defines static world geometry such as buildings that block
// line‑of‑sight.  `blocksLOS` toggles occlusion and `radius` is the
// effective radius used in LOS computations.
export type Cover = { blocksLOS: boolean; radius: number };

// Smoke volumes block vision for a limited time.  `pos` stores the XZ
// location.  `radius` defines how far the smoke extends.  `startTime` and
// `endTime` specify when the smoke is active.
export type Smoke = {
  pos: { x: number; z: number };
  radius: number;
  startTime: number;
  endTime: number;
};

// Supply points provide ammunition or other resources to units.  They do not
// participate in LOS computations.
export type Supply = { isSupplyPoint: boolean; refillRate: number };

// Ammunition tracking.  `normal` counts regular rounds and `special`
// counts special rounds used for abilities.
export type Ammo = { normal: number; special: number };