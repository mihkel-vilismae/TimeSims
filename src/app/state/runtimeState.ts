export type RuntimeMode = 'planning' | 'executing';

export type RuntimeState = {
  mode: RuntimeMode;
  executionLocked: boolean;
};

export function createRuntimeState(): RuntimeState {
  return { mode: 'planning', executionLocked: false };
}

export function setRuntimeMode(s: RuntimeState, mode: RuntimeMode): RuntimeState {
  if (s.mode === mode) return s;
  return { ...s, mode };
}

export function setExecutionLocked(s: RuntimeState, executionLocked: boolean): RuntimeState {
  if (s.executionLocked === executionLocked) return s;
  return { ...s, executionLocked };
}
