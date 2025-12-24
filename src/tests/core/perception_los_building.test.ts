// Basic LOS blocking tests.  These tests verify that buildings along
// the line of sight block visibility and that moving an occluder off
// the direct path restores LOS.

import assert from 'assert';
import { computeLOS } from '../../timesims/core/los';

// Define a helper to build a Vec2.
const v = (x: number, z: number) => ({ x, z });

export async function runTests() {
  // Simple scenario: unit at origin, enemy at (10,0), building in between.
  const unit = v(0, 0);
  const enemy = v(10, 0);
  const buildings = [{ pos: v(5, 0), radius: 1 }];
  const smokes: any[] = [];
  const losBlocked = computeLOS(unit, enemy, buildings, smokes, 0);
  assert.strictEqual(losBlocked, false, 'LOS should be blocked by a building on path');

  // Move the building away from the line; LOS should be clear.
  const buildings2 = [{ pos: v(5, 5), radius: 1 }];
  const losClear = computeLOS(unit, enemy, buildings2, smokes, 0);
  assert.strictEqual(losClear, true, 'LOS should be clear when building is off the path');

  // Place two buildings; only one on path should block.
  const buildings3 = [
    { pos: v(5, 0), radius: 1 },
    { pos: v(3, 4), radius: 1 }
  ];
  const losBlocked2 = computeLOS(unit, enemy, buildings3, smokes, 0);
  assert.strictEqual(losBlocked2, false, 'LOS should still be blocked when one building is on path');
}