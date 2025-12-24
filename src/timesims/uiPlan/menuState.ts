export type UnitKind = 'infantry' | 'tank' | 'ifv' | 'bunker';

export type MenuCommand = 'move' | 'deploySmoke' | 'fortify' | 'reloadSpecial' | 'refill';

export type MenuState = {
  open: boolean;
  x: number;
  y: number;
  /** UI-only selection; MUST NOT mutate any TimelinePlan in this module. */
  pendingCommand: MenuCommand | null;
  /** Commands shown for the currently selected unit kind. */
  commands: MenuCommand[];
  selectedUnitKind: UnitKind | null;
};

export type OpenMenuInput = {
  selectedUnitKind?: UnitKind | null;
  cursorX: number;
  cursorY: number;
  viewportW: number;
  viewportH: number;
  /** Estimated menu width in CSS pixels (used for viewport clamping). */
  menuW?: number;
  /** Estimated menu height in CSS pixels (used for viewport clamping). */
  menuH?: number;
};

export function createMenuState(): MenuState {
  return {
    open: false,
    x: 0,
    y: 0,
    pendingCommand: null,
    commands: [],
    selectedUnitKind: null,
  };
}

export function getValidCommandsForUnit(kind: UnitKind): MenuCommand[] {
  // Keep this as a simple capability table for now (UI-only).
  // Simulation/authoring validation lives elsewhere.
  switch (kind) {
    case 'infantry':
      return ['move', 'deploySmoke', 'fortify', 'reloadSpecial'];
    case 'tank':
      return ['move', 'reloadSpecial'];
    case 'ifv':
      return ['move', 'deploySmoke', 'refill', 'reloadSpecial'];
    case 'bunker':
      return ['fortify', 'reloadSpecial'];
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function openContextMenu(prev: MenuState, input: OpenMenuInput): MenuState {
  const unitKind = input.selectedUnitKind ?? prev.selectedUnitKind;
  if (unitKind == null) return prev;
  const menuW = input.menuW ?? 200;
  const menuH = input.menuH ?? 180;

  const x = clamp(input.cursorX, 0, Math.max(0, input.viewportW - menuW));
  const y = clamp(input.cursorY, 0, Math.max(0, input.viewportH - menuH));

  return {
    ...prev,
    open: true,
    x,
    y,
    selectedUnitKind: unitKind,
    commands: getValidCommandsForUnit(unitKind),
  };
}

export function closeContextMenu(prev: MenuState): MenuState {
  return { ...prev, open: false };
}

// ---------------------------------------------------------------------------
// Compatibility exports
//
// The app wiring uses these names. Keep them as tiny wrappers so we can
// refactor UI modules without breaking imports.
// ---------------------------------------------------------------------------

export const openMenu = openContextMenu;
export const closeMenu = closeContextMenu;

export function getVisibleCommandsForSelectedUnit(
  unitKind: UnitKind,
): Array<MenuCommand> {
  return getValidCommandsForUnit(unitKind);
}

export function setSelectedUnitForMenu(prev: MenuState, selectedUnitKind: UnitKind | null): MenuState {
  if (selectedUnitKind === null) {
    return { ...prev, open: false, selectedUnitKind: null, commands: [] };
  }

  // If menu is open, refresh commands for the new unit kind.
  const commands = getValidCommandsForUnit(selectedUnitKind);
  return { ...prev, selectedUnitKind, commands };
}

export function selectMenuCommand(prev: MenuState, command: MenuCommand): MenuState {
  return { ...prev, open: false, pendingCommand: command };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
