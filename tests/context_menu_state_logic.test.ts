import { strict as assert } from 'assert';
import {
  closeContextMenu,
  createMenuState,
  getValidCommandsForUnit,
  openContextMenu,
  selectMenuCommand,
  setSelectedUnitForMenu,
} from '../src/timesims/uiPlan/menuState';

export async function runTests(): Promise<void> {
  // Plan reference should not be mutated by menu state logic.
  const plan = { commands: [] as Array<unknown> };
  const planBeforeLen = plan.commands.length;

  // No selection => menu cannot open.
  {
    let state = createMenuState();
    const opened = openContextMenu(state, { cursorX: 100, cursorY: 100, viewportW: 800, viewportH: 600 });
    assert.equal(opened.open, false);
  }

  // Command list per unit kind.
  {
    const infantry = getValidCommandsForUnit('infantry');
    assert.ok(infantry.includes('move'));
    assert.ok(infantry.includes('deploySmoke'));

    const bunker = getValidCommandsForUnit('bunker');
    assert.ok(!bunker.includes('move'));
  }

  // Selection + right-click => menu opens with valid commands.
  {
    let state = createMenuState();
    state = setSelectedUnitForMenu(state, 'infantry');

    state = openContextMenu(state, { cursorX: 790, cursorY: 590, viewportW: 800, viewportH: 600 });
    assert.equal(state.open, true);
    assert.ok(state.commands.includes('move'));
    assert.ok(state.commands.includes('deploySmoke'));

    // Selecting a command updates UI state only.
    state = selectMenuCommand(state, 'move');
    assert.equal(state.pendingCommand, 'move');
    assert.equal(state.open, false);

    // Explicit close is idempotent.
    state = closeContextMenu(state);
    assert.equal(state.open, false);
  }

  // Plan remains unchanged.
  assert.equal(plan.commands.length, planBeforeLen);
}
