import { describe, expect, it } from 'vitest';

import { applySelectionHighlight } from '../../app/systems/selectionSystem';

describe('selectionSystem.applySelectionHighlight', () => {
  it('does not throw and hides all rings when selectedUnitId is undefined', () => {
    const world = {
      units: [
        { id: 'u1', selectionRing: { visible: true } },
        { id: 'u2', selectionRing: { visible: true } },
      ],
    } as any;

    expect(() => applySelectionHighlight({ world, selectedUnitId: undefined })).not.toThrow();
    expect(world.units[0].selectionRing.visible).toBe(false);
    expect(world.units[1].selectionRing.visible).toBe(false);
  });

  it('shows only the selected unit ring when selectedUnitId is provided', () => {
    const world = {
      units: [
        { id: 'u1', selectionRing: { visible: false } },
        { id: 'u2', selectionRing: { visible: false } },
      ],
    } as any;

    applySelectionHighlight({ world, selectedUnitId: 'u2' });
    expect(world.units[0].selectionRing.visible).toBe(false);
    expect(world.units[1].selectionRing.visible).toBe(true);
  });
});
