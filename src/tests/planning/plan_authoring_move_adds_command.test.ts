import { strict as assert } from 'node:assert';
import type { TimelinePlan } from '../../model/components';
import { authorMoveCommand } from '../../timesims/uiPlan/authoring';

export async function runTests() {
  {
    const plan: TimelinePlan = { commands: [] };
    const res = authorMoveCommand({
      unitId: 'u1',
      unitKind: 'infantry',
      moveSpeed: 2,
      plan,
      startTime: 0,
      fromPos: { x: 0, y: 0, z: 0 },
      toPos: { x: 1, y: 0, z: 0 },
      dt: 0.1,
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.nextPlan.commands.length, 1);
      const cmd = res.nextPlan.commands[0];
      assert.equal(cmd.kind, 'move');
      assert.equal(cmd.startTime, 0);
      // distance=1, speed=2 => 0.5s, quantized up to dt=0.1 => 0.5
      assert.equal(cmd.duration, 0.5);
      assert.equal(cmd.target.x, 1);
      assert.equal(cmd.target.z, 0);
    }
  }

  {
    const plan: TimelinePlan = { commands: [] };
    const res = authorMoveCommand({
      unitId: 'u1',
      unitKind: 'infantry',
      moveSpeed: 2,
      plan,
      startTime: 0,
      fromPos: { x: 0, y: 0, z: 0 },
      toPos: { x: 1, y: 0, z: 0 },
      dt: 0.1,
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.ok(res.nextPlan.commands[0].id.includes('u1:'));
    }
  }
}
