import type { Vec3 } from './components';

export type TimelineCommandBase = { id: string; startTime: number; duration: number };

export type MoveCommand = TimelineCommandBase & { kind: 'move'; direction: Vec3 };
export type FortifyCommand = TimelineCommandBase & { kind: 'fortify' };
export type ReloadSpecialCommand = TimelineCommandBase & { kind: 'reloadSpecial' };
export type DeploySmokeCommand = TimelineCommandBase & {
  kind: 'deploySmoke';
  radius: number;
  center: Vec3;
};
export type RefillCommand = TimelineCommandBase & { kind: 'refill' };
export type TimelineCommand =
  | MoveCommand
  | FortifyCommand
  | ReloadSpecialCommand
  | DeploySmokeCommand
  | RefillCommand;

export type TimelinePlan = { commands: TimelineCommand[] };

export type TimelineMarker = { t: number; kind: string; message: string };

export type TimelineInterruption = { t: number; reason: string } | null;

export type TimelineRuntime = {
  nowT: number;
  activeCommandId: string | null;
  interruption: TimelineInterruption;
  markers: TimelineMarker[];
};
