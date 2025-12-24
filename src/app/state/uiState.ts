import type { MenuState, PendingCommandKind } from '../../timesims/uiPlan/menuState';

export type UiState = {
  selectedUnitId: string | null;
  menu: MenuState;
  pendingCommand: PendingCommandKind | null;
  /** Timeline scrub time in seconds (planning UX). */
  scrubT: number;
};

export function createUiState(initMenu: MenuState): UiState {
  return {
    selectedUnitId: null,
    menu: initMenu,
    pendingCommand: null,
    scrubT: 0,
  };
}

export function setSelectedUnitId(s: UiState, unitId: string | null): UiState {
  if (s.selectedUnitId === unitId) return s;
  return { ...s, selectedUnitId: unitId };
}

export function setMenuState(s: UiState, menu: MenuState): UiState {
  return { ...s, menu };
}

export function setPendingCommand(s: UiState, pendingCommand: PendingCommandKind | null): UiState {
  return { ...s, pendingCommand };
}

export function setScrubT(s: UiState, scrubT: number): UiState {
  return { ...s, scrubT };
}
