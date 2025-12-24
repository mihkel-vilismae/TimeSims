// Planning utilities for TimeSims.  At the moment this file only
// contains validation helpers used by both planning and execution
// phases.

import type { TimelineCommand } from '../../model/commands';

/**
 * Validate a list of timeline commands against the prepare phase.  If a
 * refill command overlaps the beginning of the incoming phase by up to
 * two seconds a warning is produced.  Additional validation rules can
 * be added here in the future.
 *
 * @param cmds       Array of timeline commands to validate
 * @param prepare    The time when the incoming phase begins
 * @returns Array of warning codes
 */
export function validatePlan(cmds: TimelineCommand[], prepare: number): string[] {
  const warnings: string[] = [];
  for (const c of cmds) {
    if (
      c.kind === 'refill' &&
      c.startTime < prepare + 2 &&
      c.startTime + c.duration > prepare
    ) {
      warnings.push('WARN_REFILL_DURING_INCOMING');
    }
  }
  return warnings;
}