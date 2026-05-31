import type { Jockey } from "@/game/types";

/**
 * Calculate a jockey's current overall rating.
 *
 * Averages the five jockey stats (pacing, positioning, vigor, gateSkill, temperament).
 * Returns a 0–100 score.
 *
 * @param jockey - The jockey to rate
 * @returns Rounded average of all jockey stats
 */
export function calculateJockeyRating(jockey: Jockey): number {
  return Math.round(
    (jockey.stats.pacing +
      jockey.stats.positioning +
      jockey.stats.vigor +
      jockey.stats.gateSkill +
      jockey.stats.temperament) /
      5,
  );
}

/**
 * Get both current and potential ability for a jockey.
 *
 * Ensures `potential` is never lower than `current` as a defensive guarantee.
 *
 * @param jockey - The jockey to evaluate
 * @returns Object with current and potential ability scores
 */
export function getJockeyAbility(jockey: Jockey): { current: number; potential: number } {
  const current = calculateJockeyRating(jockey);
  return { current, potential: Math.max(jockey.potential, current) };
}
