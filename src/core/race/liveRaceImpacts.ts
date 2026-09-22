/**
 * liveRaceImpacts.ts - Player-facing race impacts applied immediately
 *
 * When the player watches a race finish live, prize money (cash + ledger
 * transactions), prestige (reputation) and syndicate satisfaction should
 * land right away instead of waiting for the next day advance. This module
 * marks which impacts inside a race's impact batch are safe to apply live.
 * The day-advance race resolution phase skips these same impacts for races
 * flagged `livePlayerImpactsApplied` so nothing is double-counted.
 *
 * Related files: ../../game/store/slices/raceEntryActions.ts (applies live),
 * ../time/phases/raceResolution.ts (skips on day advance)
 */

import type { AnyImpact } from "@/core/resolver/impacts";
import type { CashImpact, TransactionImpact } from "@/core/resolver/impacts/financialImpacts";

export function isLivePlayerImpact(impact: AnyImpact): boolean {
  switch (impact.type) {
    case "cash_change":
      return (impact as CashImpact).entityId === "player";
    case "transaction":
      return (impact as TransactionImpact).category === "prize_money";
    case "reputation_change":
    case "syndicate_satisfaction":
      return true;
    default:
      return false;
  }
}
