/**
 * liveRaceImpacts.ts - Player-facing race impacts applied immediately
 *
 * When a race finishes live, results (race history, form, fame, energy,
 * speed figures), prize money for every stable, prestige and syndicate stakes
 * land right away instead of waiting for the next day advance. This module
 * marks which impacts inside a race's impact batch are safe to apply live.
 * The day-advance race resolution phase skips these same impacts for races
 * flagged `livePlayerImpactsApplied` so nothing is double-counted.
 *
 * Related files: ../../game/store/slices/raceEntryActions.ts (applies live),
 * ../time/phases/raceResolution.ts (skips on day advance)
 */

import type { AnyImpact } from "@/core/resolver/impacts";
import type { TransactionImpact } from "@/core/resolver/impacts/financialImpacts";

/** Impact types applied the instant a race finishes, for every stable and horse. */
const LIVE_IMPACT_TYPES = new Set<string>([
  "cash_change",
  "reputation_change",
  "syndicate_satisfaction",
  "race_history",
  "form_change",
  "fame_change",
  "energy_change",
  "beyer_update",
  "recovery_change",
  "distance_aptitude_shift",
  "jockey_stats",
  "trainer_stats",
  "jockey_affinity_gain",
  "triple_crown_progress",
]);

export function isLivePlayerImpact(impact: AnyImpact): boolean {
  if (impact.type === "transaction") {
    return (impact as TransactionImpact).category === "prize_money";
  }
  return LIVE_IMPACT_TYPES.has(impact.type);
}
