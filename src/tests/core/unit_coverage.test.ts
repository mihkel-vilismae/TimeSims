// Tests perception and detection for multiple unit archetypes.  Each unit
// has a different vision radius and moves at different speeds.  We
// verify that detection occurs at the expected time and that units
// without movement plans do not trigger interrupts.

import assert from 'assert';
import { simulatePlanning } from '../src/timesims/core/simulation';

const v = (x: number, z: number) => ({ x, z });

export async function runTests() {
  // Define a few archetypes with different vision and speeds.
  const archetypes = [
    { id: 'infantry', vision: 5, speed: 1 },
    { id: 'tank', vision: 6, speed: 0.5 },
    { id: 'ifv', vision: 4, speed: 1.2 },
    { id: 'bunker', vision: 3, speed: 0 }
  ];
  for (const arch of archetypes) {
    const world = {
      units: [
        {
          id: arch.id,
          pos: v(0, 0),
          visionRadius: arch.vision,
          plan: { commands: [] },
          speed: arch.speed
        }
      ],
      enemies: [
        {
          id: 'e1',
          pos: v(arch.vision - 1, 0)
        }
      ],
      buildings: [] as any[],
      smokes: [] as any[]
    };
    const { markers } = simulatePlanning(world, { dt: 0.5, endTime: 2 });
    const detection = markers.find((m) => m.kind === 'detection');
    assert.ok(
      detection,
      `${arch.id} should detect the enemy at t=0 since it is within vision radius`
    );
    assert.ok(
      detection.t === 0,
      `${arch.id} detection should occur at t=0; got t=${detection.t}`
    );
    // No interrupt markers expected since there is no move command.
    const interrupt = markers.find((m) => m.kind === 'interrupt');
    assert.strictEqual(
      interrupt,
      undefined,
      `${arch.id} should not emit an interrupt marker without movement`
    );
  }
}