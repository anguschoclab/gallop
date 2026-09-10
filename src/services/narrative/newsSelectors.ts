/**
 * newsSelectors.ts - Memoized selectors for seed gazette news slot builders
 *
 * Each selector filters and sorts its input once per input-array reference and
 * caches the result in a module-level WeakMap. Subsequent calls with the same
 * array reference return the cached result without recomputing.
 *
 * Assumption: callers must not mutate the input array between calls. This holds
 * during gazette generation — stables, horses, and races are fully built before
 * `seedGazetteNews` runs and are not modified during news generation.
 *
 * Convention follows `src/services/race/racePlaybackService.ts` (WeakMap cache).
 */

import { calculateOverallRating } from "@/core/horse/stats";
import { isPlayerOwned, isNpcOwned } from "@/core/horse/ownership";
import type { Race, Horse, Stable } from "@/game/types";

const eliteMajorCache = new WeakMap<Stable[], Stable[]>();

/**
 * Returns elite, major stables sorted by reputation descending.
 *
 * @param stables - All stables in the game world.
 * @returns Cached elite+major stables sorted by reputation desc.
 */
export function getEliteMajorStables(stables: Stable[]): Stable[] {
  let cached = eliteMajorCache.get(stables);
  if (cached) return cached;
  cached = stables
    .filter((s) => s.tier === "elite" && s.isMajor)
    .sort((a, b) => b.reputation - a.reputation);
  eliteMajorCache.set(stables, cached);
  return cached;
}

const npcHorsesCache = new WeakMap<Horse[], Horse[]>();

/**
 * Returns NPC-owned horses (excluding player-owned).
 *
 * @param horses - All horses in the game world.
 * @returns Cached NPC-owned horses (unsorted).
 */
export function getNpcHorses(horses: Horse[]): Horse[] {
  let cached = npcHorsesCache.get(horses);
  if (cached) return cached;
  cached = horses.filter((h) => !isPlayerOwned(h) && isNpcOwned(h));
  npcHorsesCache.set(horses, cached);
  return cached;
}

const npcHorsesByRatingCache = new WeakMap<Horse[], { horse: Horse; rating: number }[]>();

/**
 * Returns NPC-owned horses with their overall ratings, sorted by rating desc.
 *
 * @param horses - All horses in the game world.
 * @returns Cached list of { horse, rating } sorted by rating desc.
 */
export function getNpcHorsesByRating(horses: Horse[]): { horse: Horse; rating: number }[] {
  let cached = npcHorsesByRatingCache.get(horses);
  if (cached) return cached;
  cached = getNpcHorses(horses)
    .map((h) => ({ horse: h, rating: calculateOverallRating(h) }))
    .sort((a, b) => b.rating - a.rating);
  npcHorsesByRatingCache.set(horses, cached);
  return cached;
}

const g1RacesByDayCache = new WeakMap<Race[], Race[]>();

/**
 * Returns Grade 1 races sorted by day ascending.
 *
 * @param races - All scheduled races.
 * @returns Cached G1 races sorted by day asc.
 */
export function getG1RacesByDay(races: Race[]): Race[] {
  let cached = g1RacesByDayCache.get(races);
  if (cached) return cached;
  cached = races.filter((r) => r.graded?.grade === "G1").sort((a, b) => a.day - b.day);
  g1RacesByDayCache.set(races, cached);
  return cached;
}

const gradedRacesByDayCache = new WeakMap<Race[], Race[]>();

/**
 * Returns all graded races sorted by day ascending.
 *
 * @param races - All scheduled races.
 * @returns Cached graded races sorted by day asc.
 */
export function getGradedRacesByDay(races: Race[]): Race[] {
  let cached = gradedRacesByDayCache.get(races);
  if (cached) return cached;
  cached = races.filter((r) => r.graded).sort((a, b) => a.day - b.day);
  gradedRacesByDayCache.set(races, cached);
  return cached;
}

const veteransByFameCache = new WeakMap<Horse[], Horse[]>();

/**
 * Returns veteran horses (age >= 6) sorted by fame descending.
 *
 * @param horses - All horses in the game world.
 * @returns Cached veterans sorted by fame desc.
 */
export function getVeteransByFame(horses: Horse[]): Horse[] {
  let cached = veteransByFameCache.get(horses);
  if (cached) return cached;
  cached = horses.filter((h) => h.age >= 6).sort((a, b) => b.fame - a.fame);
  veteransByFameCache.set(horses, cached);
  return cached;
}
