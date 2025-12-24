// Tests that smoke volumes block line of sight until they dissipate.  The
// unit should not detect the enemy until the smoke has ended.

import assert from 'assert';
import { simulatePlanning } from '../../timesims/core/simulation';

import { test } from 'vitest';
const v = (x: number, z: number) => ({ x, z });

export async function runTests() {
  const world = {
    units: [
      {
        id: 'u1',
        pos: v(0, 0),
        visionRadius: 10,
        plan: { commands: [] },
        speed: 0
      }
    ],
    enemies: [
      {
        id: 'e1',
        pos: v(10, 0)
      }
    ],
    buildings: [] as any[],
    smokes: [
      {
        pos: v(5, 0),
        radius: 2,
        startTime: 0,
        endTime: 2
      }
    ]
  };
  const { markers } = simulatePlanning(world, { dt: 0.5, endTime: 5 });
  // Ensure no detection occurs while smoke is active.
  const preDetections = markers.filter((m) => m.kind === 'detection' && m.t <= 2);
  assert.strictEqual(
    preDetections.length,
    0,
    'No detection should occur before smoke dissipates'
  );
  // There should be a detection marker after smoke ends.
  const det = markers.find((m) => m.kind === 'detection');
  assert.ok(det, 'A detection marker should be emitted after smoke ends');
  assert.ok(
    det.t >= 2,
    `Detection should occur at or after t=2, observed at t=${det.t}`
  );
}

// Vitest wrapper for legacy runTests-style suites
test('core/perception_smoke.test.ts', async () => {
  await runTests();
});
