/**
 * trackGeometry.ts - Track geometry and gradient scoring
 *
 * This file provides scoring functions for evaluating how well a horse's
 * attributes match a track's geometry (galloping vs tight tracks) and gradient
 * (hilly tracks).
 *
 * Dependencies: @/game/types (Horse, Race)
 * Related files: entryScoring.ts (uses geometry scores for race entry evaluation)
 */

import type { Horse, Race } from "@/game/types";

/**
 * Calculate track geometry score for a horse at a race.
 *
 * Large tracks (large radii, long straights) favor speed and long-striding horses.
 * Tight tracks (small radii, short straights) favor agility and cornering.
 *
 * @param horse - The horse to evaluate
 * @param race - The race with track information
 * @returns Geometry score (higher is better)
 *
 * @example
 * const score = calculateTrackGeometryScore(horse, race);
 */
export function calculateTrackGeometryScore(horse: Horse, race: Race): number {
  let score = 0;

  const trackId = race.graded?.trackId || race.trackId;

  // For this logic, we'll assume the sim has already resolved the course
  // If we can't find exact radii, we check the straightLength as a proxy for "Galloping" vs "Tight"
  const straight = race.graded ? 400 : 350; // Simplified for AI heuristic

  if (straight > 450) {
    // Galloping track: favors speed and long-striding horses
    if (horse.stats.speed > 70) score += 15;
    if (horse.corneringAptitude < 0.95) score += 10; // "Lumbering" speedsters are OK here
  } else if (straight < 350) {
    // Tight "Bullring": favors agility and cornering
    if (horse.corneringAptitude > 1.05) score += 20;
    if (horse.stats.acceleration > 70) score += 15;
    if (horse.corneringAptitude < 0.9) score -= 25; // Don't enter bad cornerers here
  }

  return score;
}

/**
 * Calculate gradient score for a horse at a race.
 *
 * If the race is at a known hilly track (e.g., Nakayama, Ascot), checks
 * the horse's climbing aptitude and applies bonuses/penalties.
 *
 * @param horse - The horse to evaluate
 * @param race - The race with track information
 * @returns Gradient score (positive for good climbers, negative for poor)
 *
 * @example
 * const score = calculateGradientScore(horse, race);
 */
export function calculateGradientScore(horse: Horse, race: Race): number {
  let score = 0;

  const isHilly =
    race.graded?.track.toLowerCase().includes("nakayama") ||
    race.graded?.track.toLowerCase().includes("ascot");

  if (isHilly) {
    if (horse.climbingAptitude > 1.05) score += 20;
    if (horse.climbingAptitude < 0.95) score -= 20;
  }

  return score;
}
