import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { Ammo, Faction, Health, MoveSpeed, Transform, Vec3, Vision, Weapon } from '../../model/components';

export type UnitKind = 'infantry' | 'tank' | 'ifv' | 'bunker';

export type UnitRuntime = {
  id: string;
  kind: UnitKind;
  transform: Transform;
  moveSpeed?: MoveSpeed;
  vision: Vision;
  weapon: Weapon;
  faction: Faction;
  health: Health;
  ammo: Ammo;
  mesh: THREE.Object3D;
  selectionRing: THREE.Mesh;
  visionRing: THREE.Mesh;
  weaponRing: THREE.Mesh;
};

export type EnemyRuntime = {
  id: string;
  transform: Transform;
  moveSpeed: MoveSpeed;
  vision: Vision;
  weapon: Weapon;
  faction: Faction;
  health: Health;
  mesh: THREE.Object3D;
};

export type BuildingRuntime = {
  id: string;
  transform: Transform;
  blocksLOS: boolean;
  mesh: THREE.Object3D;
};

export type RuntimeWorld = {
  ground: THREE.Mesh;
  units: UnitRuntime[];
  enemies: EnemyRuntime[];
  buildings: BuildingRuntime[];
};

const v3 = (x: number, z: number): Vec3 => ({ x, y: 0, z });

function makeRing(radius: number, colorHex: number, opacity: number): THREE.Mesh {
  const g = new THREE.RingGeometry(radius * 0.98, radius * 1.02, 64);
  const m = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 2;
  return ring;
}

function makeSelectionRing(): THREE.Mesh {
  return makeRing(1.2, 0x00d4ff, 0.75);
}

function makeVisionRing(radius: number): THREE.Mesh {
  return makeRing(radius, 0x0aff66, 0.18);
}

function makeWeaponRing(radius: number): THREE.Mesh {
  return makeRing(radius, 0xffaa00, 0.16);
}

function applyXZ(obj: THREE.Object3D, pos: Vec3): void {
  obj.position.set(pos.x, pos.y, pos.z);
}

async function loadModel(loader: GLTFLoader, url: string): Promise<THREE.Object3D> {
  const gltf = await loader.loadAsync(url);
  return gltf.scene;
}

export async function createRuntimeWorld(scene: THREE.Scene): Promise<RuntimeWorld> {
  const loader = new GLTFLoader();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.95, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Models
  const infantryModel = await loadModel(loader, new URL('../../assets/infantry.glb', import.meta.url).toString());
  const tankModel = await loadModel(loader, new URL('../../assets/tank.glb', import.meta.url).toString());
  const ifvModel = await loadModel(loader, new URL('../../assets/ifv.glb', import.meta.url).toString());
  const bunkerModel = await loadModel(loader, new URL('../../assets/bunker.glb', import.meta.url).toString());
  const enemyModel = await loadModel(loader, new URL('../../assets/enemy.glb', import.meta.url).toString());
  const buildingModel = await loadModel(loader, new URL('../../assets/building_block.glb', import.meta.url).toString());

  const units: UnitRuntime[] = [];
  const enemies: EnemyRuntime[] = [];
  const buildings: BuildingRuntime[] = [];

  const addUnit = (id: string, kind: UnitKind, pos: Vec3, speed: number | null, visionR: number, fireR: number): void => {
    const base = (kind === 'infantry' ? infantryModel : kind === 'tank' ? tankModel : kind === 'ifv' ? ifvModel : bunkerModel).clone(true);
    base.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    applyXZ(base, pos);
    scene.add(base);

    const selectionRing = makeSelectionRing();
    selectionRing.visible = false;
    applyXZ(selectionRing, pos);
    scene.add(selectionRing);

    const visionRing = makeVisionRing(visionR);
    applyXZ(visionRing, pos);
    scene.add(visionRing);

    const weaponRing = makeWeaponRing(fireR);
    applyXZ(weaponRing, pos);
    scene.add(weaponRing);

    units.push({
      id,
      kind,
      transform: { pos, rot: { yaw: 0, pitch: 0, roll: 0 } },
      moveSpeed: speed == null ? undefined : { metersPerSecond: speed },
      vision: { radius: visionR, losMask: 0xffffffff },
      weapon: { fireRadius: fireR, cooldown: 0.35, suppressionPower: 0.0, canSmoke: kind !== 'bunker' },
      faction: { kind: 'player' },
      health: { hp: 100, maxHp: 100 },
      ammo: { normal: 90, special: 3 },
      mesh: base,
      selectionRing,
      visionRing,
      weaponRing,
    });
  };

  const addEnemy = (id: string, pos: Vec3): void => {
    const base = enemyModel.clone(true);
    base.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    applyXZ(base, pos);
    scene.add(base);

    enemies.push({
      id,
      transform: { pos, rot: { yaw: 0, pitch: 0, roll: 0 } },
      moveSpeed: { metersPerSecond: 2.0 },
      vision: { radius: 18, losMask: 0xffffffff },
      weapon: { fireRadius: 12, cooldown: 0.6, suppressionPower: 0.1, canSmoke: false },
      faction: { kind: 'enemy' },
      health: { hp: 60, maxHp: 60 },
      mesh: base,
    });
  };

  const addBuilding = (id: string, pos: Vec3, blocksLOS: boolean): void => {
    const base = buildingModel.clone(true);
    applyXZ(base, pos);
    scene.add(base);
    buildings.push({
      id,
      transform: { pos, rot: { yaw: 0, pitch: 0, roll: 0 } },
      blocksLOS,
      mesh: base,
    });
  };

  addUnit('u_infantry', 'infantry', v3(-12, -6), 4.0, 20, 10);
  addUnit('u_tank', 'tank', v3(-8, 8), 3.0, 22, 14);
  addUnit('u_ifv', 'ifv', v3(-16, 8), 4.2, 20, 12);
  addUnit('u_bunker', 'bunker', v3(10, 0), null, 24, 16);

  addEnemy('e1', v3(22, -12));
  addEnemy('e2', v3(24, 10));

  addBuilding('b1', v3(0, 0), true);
  // Decorative static building mesh (does not block)
  const deco = buildingModel.clone(true);
  applyXZ(deco, v3(0, -18));
  deco.scale.setScalar(1.3);
  scene.add(deco);

  return { ground, units, enemies, buildings };
}
