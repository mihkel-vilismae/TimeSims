// Simulate a mid‑game turn with three units executing different commands.
// We check that validation warnings for refilling during incoming waves are
// produced and that detection/interruption markers are ordered sensibly.

import assert from 'assert';
import { simulatePlanning } from '../../timesims/core/simulation';

const v = (x: number, z: number) => ({ x, z });

export async function runTests() {
  const world = {
    units: [
      // Infantry: moves then fortifies
      {
        id: 'inf',
        pos: v(0, 0),
        visionRadius: 5,
        plan: {
          commands: [
            {
              id: 'inf_move',
              kind: 'move',
              startTime: 0,
              duration: 5,
              direction: { x: 1, y: 0, z: 0 }
            },
            {
              id: 'inf_fort',
              kind: 'fortify',
              startTime: 5,
              duration: 2
            }
          ]
        },
        speed: 1
      },
      // Tank: moves then reloads special then fortifies
      {
        id: 'tank',
        pos: v(0, -3),
        visionRadius: 6,
        plan: {
          commands: [
            {
              id: 'tank_move',
              kind: 'move',
              startTime: 0,
              duration: 3,
              direction: { x: 1, y: 0, z: 0 }
            },
            {
              id: 'tank_reload',
              kind: 'reloadSpecial',
              startTime: 3,
              duration: 5
            },
            {
              id: 'tank_fort',
              kind: 'fortify',
              startTime: 8,
              duration: 3
            }
          ]
        },
        speed: 0.8
      },
      // IFV: moves to supply, refills, then moves again
      {
        id: 'ifv',
        pos: v(0, 3),
        visionRadius: 4,
        plan: {
          commands: [
            {
              id: 'ifv_move1',
              kind: 'move',
              startTime: 0,
              duration: 2,
              direction: { x: 1, y: 0, z: 0 }
            },
            {
              id: 'ifv_refill',
              kind: 'refill',
              startTime: 2,
              duration: 10
            },
            {
              id: 'ifv_move2',
              kind: 'move',
              startTime: 12,
              duration: 3,
              direction: { x: 1, y: 0, z: 0 }
            }
          ]
        },
        speed: 1.2
      }
    ],
    enemies: [
      {
        id: 'e1',
        pos: v(20, 0)
      }
    ],
    buildings: [
      {
        pos: v(10, 0),
        radius: 2
      }
    ],
    smokes: [] as any[]
  };
  const opts = { dt: 0.5, prepareDuration: 10, endTime: 20 };
  const { markers, warnings } = simulatePlanning(world, opts);
  // There should be exactly one refill warning for the IFV overlapping the incoming phase.
  const refillWarnings = warnings.filter((w) => w === 'WARN_REFILL_DURING_INCOMING');
  assert.strictEqual(
    refillWarnings.length,
    1,
    'Exactly one refill warning should be produced for overlapping incoming phase'
  );
  // Ensure markers are in non‑decreasing time order.
  for (let i = 1; i < markers.length; i++) {
    assert.ok(
      markers[i].t >= markers[i - 1].t,
      `Marker times should be non‑decreasing: ${markers[i - 1].t} -> ${markers[i].t}`
    );
  }
}