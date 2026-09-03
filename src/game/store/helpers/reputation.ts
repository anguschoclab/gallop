/**
 * helpers/reputation.ts - Applying reputation events to store state
 *
 * Small store-side helper that folds one or more reputation events into the
 * player's ManagerReputation, keeping the score clamped, the tier in sync and
 * the event log bounded.
 *
 * Dependencies: @/core/reputation
 * Related files: src/game/store/slices/exchangeSlice.ts,
 *   src/game/store/slices/syndicateActions.ts
 */

import {
  getReputationTier,
  type ManagerReputation,
  type ReputationEvent,
} from "@/core/reputation";

/** Maximum number of reputation events retained. */
export const MAX_REPUTATION_EVENTS = 200;

/** A blank reputation record, used when the player has none yet. */
export function emptyReputation(): ManagerReputation {
  return {
    score: 0,
    tier: "unknown",
    events: [],
    gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
    totalWins: 0,
    yearsActive: 0,
  };
}

/**
 * Fold reputation events into a reputation record.
 *
 * @param current - Existing reputation, if any
 * @param events - Events to apply (nulls are ignored for caller convenience)
 * @returns A new ManagerReputation with score clamped to 0-1000 and tier updated
 */
export function applyReputationEvents(
  current: ManagerReputation | undefined,
  events: readonly (ReputationEvent | null | undefined)[],
): ManagerReputation {
  const base = current ?? emptyReputation();
  const applied = events.filter((e): e is ReputationEvent => Boolean(e));
  if (applied.length === 0) return base;

  const delta = applied.reduce((sum, e) => sum + e.amount, 0);
  const score = Math.max(0, Math.min(1000, base.score + delta));

  return {
    ...base,
    score,
    tier: getReputationTier(score),
    events: [...base.events, ...applied].slice(-MAX_REPUTATION_EVENTS),
  };
}
