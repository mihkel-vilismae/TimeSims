// Planning utilities for TimeSims.
//
// This module is a small barrel for planning-related helpers.
// Validation is defined in validatePlan.ts so it can be shared by
// planning, execution, and UI authoring without circular imports.

export { validatePlan } from './validatePlan';
export type { TimelineCommand } from '../../model/commands';
