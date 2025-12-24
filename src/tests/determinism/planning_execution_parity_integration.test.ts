// Tests that planning and execution simulations produce identical
// markers for the same world and plan.  This ensures that both
// phases share the same core logic.

import assert from 'assert';
import { simulatePlanning, simulateExecution } from '../../timesims/core/simulation';

const v = (x: number, z: number) => ({ x, z });

export async function runTests() {
  const world = {
    units: [
      {
        id: 'u1',
        pos: v(0, 0),
        visionRadius: 2,
        plan: {
          commands: [
            {
              id: 'm1',
              kind: 'move',
              startTime: 0,
              duration: 5,
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
        pos: v(3, 0)
      }
    ],
    buildings: [] as any[],
    smokes: [] as any[]
  };
  const opts = { dt: 0.5, endTime: 5 };
  const planning = simulatePlanning(world, opts);
  const execution = simulateExecution(world, opts);
  assert.deepStrictEqual(
    planning.markers,
    execution.markers,
    'Planning and execution should produce identical markers'
  );
}