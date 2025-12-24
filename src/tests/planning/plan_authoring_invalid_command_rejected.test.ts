import { strict as assert } from 'node:assert';
import type { TimelinePlan } from '../src/model/components';
import { authorMoveCommand } from '../src/timesims/uiPlan/authoring';

export async function runTests() {
  const plan: TimelinePlan = { commands: [] };
  const res = authorMoveCommand({
    unitId: 'b1',
    unitKind: 'bunker',
    moveSpeed: 1,
    plan,
    startTime: 0,
    fromPos: { x: 0, y: 0, z: 0 },
    toPos: { x: 10, y: 0, z: 0 },
    dt: 0.1,
  });

  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, 'E_UNIT_CANNOT_MOVE');
  assert.equal(plan.commands.length, 0);
}
