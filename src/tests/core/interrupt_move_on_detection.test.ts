// Tests that a move command is interrupted when the unit detects an enemy.

import assert from 'assert';
import { simulatePlanning } from '../../timesims/core/simulation';

const v = (x: number, z: number) => ({ x, z });

export async function runTests() {
  const world = {
    units: [
      {
        id: 'u1',
        pos: v(0, 0),
        visionRadius: 1,
        plan: {
          commands: [
            {
              id: 'm1',
              kind: 'move',
              startTime: 0,
              duration: 10,
              direction: { x: 1, y: 0, z: 0 }
            }
          ]
        },
        speed: 1
      }
    ],
    enemies: [
      {
        id: 'e1',
        pos: v(5, 0)
      }
    ],
    buildings: [] as any[],
    smokes: [] as any[]
  };
  // Use dt=1 so positions update by 1 unit per second.  Detection
  // should occur when the unit reaches x=4 (distance 1 from enemy).  Note
  // that positions update before detection is evaluated, so detection
  // occurs at t=3.
  const { markers, units } = simulatePlanning(world, { dt: 1, endTime: 6 });
  const detection = markers.find((m) => m.kind === 'detection');
  assert.ok(detection, 'Detection should occur when unit comes within vision range');
  assert.ok(
    Math.abs(detection.t - 3) < 1e-6,
    `Detection should occur at t=3, observed at t=${detection.t}`
  );
  const interrupt = markers.find((m) => m.kind === 'interrupt');
  assert.ok(interrupt, 'Interrupt marker should be emitted when detection occurs during move');
  assert.strictEqual(
    interrupt.t,
    detection.t,
    'Interrupt should occur at the same time as detection'
  );
  // After interruption, the unit should not have moved beyond x=4.
  const finalPos = units[0].pos.x;
  assert.ok(
    finalPos <= 4 + 1e-6,
    `Unit should stop moving after detection; final x=${finalPos}`
  );
}