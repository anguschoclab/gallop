/**
 * lineage.ts - Foal lookup and lineage analysis utilities
 *
 * This file provides reverse-lookup helpers for finding foals by sire or dam,
 * checking stakes/G1 winner status, calculating earnings, and identifying runners.
 * Used for stallion analytics and breeding evaluation.
 *
 * Dependencies: @/game/types (Horse, GameState), @/game/constants (PRIZE_SPLIT)
 * Related files: sireAnalytics.ts (uses these functions for stallion evaluation), stallions.ts (uses for stud value calculation)
 */

import type { Horse, GameState } from "@/game/types";
import { PRIZE_SPLIT } from "@/constants/game";
import { getCareerStats } from "@/core/horse/stats";

// Memoization cache for lineage lookups
const foalsCache = new Map<string, Horse[]>();
const stakesCache = new Map<string, number>();
const g1Cache = new Map<string, number>();
const earningsCache = new Map<string, number>();
const runnersCache = new Map<string, Horse[]>();

/**
 * Clear all lineage caches.
 * Call this when horses array changes significantly (e.g., new breeding season).
 */
export function clearLineageCache(): void {
  foalsCache.clear();
  stakesCache.clear();
  g1Cache.clear();
  earningsCache.clear();
  runnersCache.clear();
}

/**
 * Get all foals by a given stallion.
 *
 * Returns all horses in the state whose pedigree.sireId matches the given stallion ID.
 *
 * @param state - Game state containing the horses array
 * @param stallionId - The stallion's ID to search for
 * @returns Array of foals sired by the stallion
 *
 * @example
 * const foals = getFoalsBy(gameState, stallion.id);
 */
export function getFoalsBy(state: Pick<GameState, "horses">, stallionId: string): Horse[] {
  const cacheKey = stallionId;
  if (foalsCache.has(cacheKey)) {
    return foalsCache.get(cacheKey)!;
  }
  const foals = state.horses.filter((h) => h.pedigree?.sireId === stallionId);
  foalsCache.set(cacheKey, foals);
  return foals;
}

/**
 * Get all foals of a given dam.
 *
 * Returns all horses in the state whose pedigree.damId matches the given dam ID.
 *
 * @param state - Game state containing the horses array
 * @param damId - The dam's ID to search for
 * @returns Array of foals from the dam
 *
 * @example
 * const foals = getFoalsOf(gameState, dam.id);
 */
export function getFoalsOf(state: Pick<GameState, "horses">, damId: string): Horse[] {
  return state.horses.filter((h) => h.pedigree?.damId === damId);
}

// "Is this foal a stakes winner?" — true if any race in their history has a
// graded badge OR raceClass Stakes/Group at position 1. Mirrors the same
// predicate used inside resolveRace's blue-hen update path.
/**
 * Check if a foal is a stakes winner.
 *
 * Returns true if the horse has won any graded stakes race or any race with
 * purse >= $18,000 at position 1.
 *
 * @param foal - The horse to check
 * @returns True if the horse is a stakes winner
 *
 * @example
 * if (isStakesWinner(foal)) {
 *   updateStallionStakesCount(stallion);
 * }
 */
export function isStakesWinner(foal: Horse): boolean {
  const stats = getCareerStats(foal);
  return (
    stats.stakesWins > 0 ||
    (stats.wins > 0 &&
      (foal.raceHistory || []).some(
        (r) => r.position === 1 && r.purse !== undefined && r.purse >= 18000,
      ))
  );
}

/**
 * Check if a foal is a G1 winner.
 *
 * Returns true if the horse has won any G1 graded race.
 *
 * @param foal - The horse to check
 * @returns True if the horse is a G1 winner
 *
 * @example
 * if (isG1Winner(foal)) {
 *   updateStallionG1Count(stallion);
 * }
 */
export function isG1Winner(foal: Horse): boolean {
  return getCareerStats(foal).g1Wins > 0;
}

/**
 * Get the count of stakes-winning foals by a stallion.
 *
 * @param state - Game state containing the horses array
 * @param stallionId - The stallion's ID
 * @returns Number of stakes-winning foals
 *
 * @example
 * const count = getStakesFoalsBy(gameState, stallion.id);
 */
export function getStakesFoalsBy(state: Pick<GameState, "horses">, stallionId: string): number {
  const cacheKey = stallionId;
  if (stakesCache.has(cacheKey)) {
    return stakesCache.get(cacheKey)!;
  }
  const count = getFoalsBy(state, stallionId).filter(isStakesWinner).length;
  stakesCache.set(cacheKey, count);
  return count;
}

/**
 * Get the count of G1-winning foals by a stallion.
 *
 * @param state - Game state containing the horses array
 * @param stallionId - The stallion's ID
 * @returns Number of G1-winning foals
 *
 * @example
 * const count = getG1FoalsBy(gameState, stallion.id);
 */
export function getG1FoalsBy(state: Pick<GameState, "horses">, stallionId: string): number {
  const cacheKey = stallionId;
  if (g1Cache.has(cacheKey)) {
    return g1Cache.get(cacheKey)!;
  }
  const count = getFoalsBy(state, stallionId).filter(isG1Winner).length;
  g1Cache.set(cacheKey, count);
  return count;
}

// Total earnings across a stallion's foals. Sums all raceHistory entries,
// taking the prize-split share for the recorded position. Approximate: we
// reconstruct earnings from purse × split rather than persisting per-race
// payouts. Good enough for AEI computation.
/**
 * Calculate a foal's lifetime earnings.
 *
 * Sums earnings from all race history entries using prize split multipliers
 * based on finishing position.
 *
 * @param foal - The horse to calculate earnings for
 * @returns Total lifetime earnings in dollars
 *
 * @example
 * const earnings = foalLifetimeEarnings(foal);
 */
export function foalLifetimeEarnings(foal: Horse): number {
  let total = 0;
  for (const r of foal.raceHistory) {
    if (r.position - 1 < PRIZE_SPLIT.length && r.purse) {
      total += Math.round(r.purse * PRIZE_SPLIT[r.position - 1]);
    }
  }
  return total;
}

/**
 * Calculate total earnings of all foals by a stallion.
 *
 * @param state - Game state containing the horses array
 * @param stallionId - The stallion's ID
 * @returns Total earnings of all foals
 *
 * @example
 * const total = totalEarningsBy(gameState, stallion.id);
 */
export function totalEarningsBy(state: Pick<GameState, "horses">, stallionId: string): number {
  const cacheKey = stallionId;
  if (earningsCache.has(cacheKey)) {
    return earningsCache.get(cacheKey)!;
  }
  const total = getFoalsBy(state, stallionId).reduce((sum, h) => sum + foalLifetimeEarnings(h), 0);
  earningsCache.set(cacheKey, total);
  return total;
}

// Foals per the "racing age" definition (2 or older). Used for AEI denominator
// and Sire Watch's runners/starters columns.
/**
 * Get racing-age foals by a stallion.
 *
 * Returns foals that are age 2+ and have at least one race start.
 * Used for AEI denominator and Sire Watch statistics.
 *
 * @param state - Game state containing the horses array
 * @param stallionId - The stallion's ID
 * @returns Array of racing-age foals that have started
 *
 * @example
 * const runners = getRunnersBy(gameState, stallion.id);
 */
export function getRunnersBy(state: Pick<GameState, "horses">, stallionId: string): Horse[] {
  const cacheKey = stallionId;
  if (runnersCache.has(cacheKey)) {
    return runnersCache.get(cacheKey)!;
  }
  const runners = getFoalsBy(state, stallionId).filter(
    (h) => h.age >= 2 && h.raceHistory.length > 0,
  );
  runnersCache.set(cacheKey, runners);
  return runners;
}
