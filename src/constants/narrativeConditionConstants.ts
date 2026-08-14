/**
 * narrativeConditionConstants.ts — Mapping tables and priority definitions for
 * condition-based PbP commentary.
 *
 * These maps translate `RunnerConditionId` values (from the simulation layer)
 * into `NarrativeEvent` types (for the commentary system), define cooldown
 * lookup per condition, tone priority for sorting, and which conditions are
 * flagged as high-impact for UI emphasis.
 */

import { NARRATIVE_THRESHOLDS } from "@/constants/narrativeThresholds";
import type { RunnerConditionId, ConditionTone } from "@/core/race/runnerConditions";
import type { NarrativeEvent } from "@/services/narrative/types";

/** Maps each runner condition ID to its corresponding NarrativeEvent type. */
export const CONDITION_TO_EVENT: Record<RunnerConditionId, NarrativeEvent> = {
  flying: "FLYING",
  battling: "BATTLING",
  boxed: "BOXED_IN",
  grinding: "GRINDING",
  flagging: "FLAGGING",
  distressed: "IN_TROUBLE",
  ailing: "AILING",
  settled: "SETTLED",
};

/** Cooldown (seconds) per condition, sourced from NARRATIVE_THRESHOLDS. */
export const CONDITION_COOLDOWN: Record<RunnerConditionId, number> = {
  flying: NARRATIVE_THRESHOLDS.CONDITION_FLYING_COOLDOWN,
  battling: NARRATIVE_THRESHOLDS.CONDITION_BATTLING_COOLDOWN,
  boxed: NARRATIVE_THRESHOLDS.CONDITION_BOXED_IN_COOLDOWN,
  grinding: NARRATIVE_THRESHOLDS.CONDITION_GRINDING_COOLDOWN,
  flagging: NARRATIVE_THRESHOLDS.CONDITION_FLAGGING_COOLDOWN,
  distressed: NARRATIVE_THRESHOLDS.CONDITION_IN_TROUBLE_COOLDOWN,
  ailing: NARRATIVE_THRESHOLDS.CONDITION_AILING_COOLDOWN,
  settled: NARRATIVE_THRESHOLDS.CONDITION_SETTLED_COOLDOWN,
};

/** Priority order for tone when sorting conditions: lower = higher priority. */
export const TONE_PRIORITY: Record<ConditionTone, number> = {
  negative: 0,
  caution: 1,
  positive: 2,
  neutral: 3,
};

/** Conditions that set `isHighImpact = true` on their commentary lines. */
export const HIGH_IMPACT_CONDITIONS: Set<RunnerConditionId> = new Set([
  "flying",
  "battling",
  "distressed",
]);
