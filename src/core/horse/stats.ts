/**
 * stats.ts - Horse stat calculations
 *
 * This file provides pure functions for calculating overall ratings, race ratings,
 * and career statistics from race history.
 *
 * Dependencies: @/game/types (Horse, RunningStyle), @/game/rng (Rng)
 * Related files: horseFactory.ts (uses for stat resolution), stable.$horseId.tsx (uses for display)
 */

import type { Horse, RunningStyle } from "@/game/types";
import type { Rng } from "@/game/rng";

/**
 * Pure functions for horse stat calculations
 * Extracted from: horseGen.ts, stable.$horseId.tsx
 */

/**
 * Calculate overall horse rating from stats.
 *
 * Computes the average of all four stats (speed, stamina, acceleration, consistency)
 * to provide a single overall rating for the horse.
 *
 * @param horse - The horse to calculate rating for
 * @returns Overall rating (0-100)
 */
export function calculateOverallRating(horse: Horse): number {
  return Math.round(
    (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration + horse.stats.consistency) /
      4,
  );
}

/**
 * Calculate race-specific rating (3-stat average).
 *
 * Computes the average of speed, stamina, and acceleration (excluding consistency).
 * Used in AI contexts where consistency is intentionally excluded.
 *
 * @param horse - The horse to calculate rating for
 * @returns Race rating (0-100)
 */
export function calculateRaceRating(horse: Horse): number {
  return Math.round((horse.stats.speed + horse.stats.stamina + horse.stats.acceleration) / 3);
}

export interface CareerStats {
  starts: number;
  wins: number;
  places: number; // finished exactly 2nd
  shows: number; // finished exactly 3rd
  gradedWins: number;
  gradedStarts: number;
  stakesWins: number;
  g1Wins: number;
  g2Wins: number;
  g3Wins: number;
  earnings: number;
  // Surface breakdown
  turfStarts: number;
  turfWins: number;
  dirtStarts: number;
  dirtWins: number;
  syntheticStarts: number;
  syntheticWins: number;
  // Distance breakdown (sprint <1400m, classic 1400–2000m, stayer ≥2000m)
  sprintStarts: number;
  sprintWins: number;
  classicStarts: number;
  classicWins: number;
  stayerStarts: number;
  stayerWins: number;
}

/**
 * Calculate career performance summary from race history.
 *
 * Analyzes the horse's race history to compute career statistics including
 * starts, wins, places, shows, graded wins, stakes wins, and earnings.
 *
 * @param horse - The horse to calculate career stats for
 * @returns Career statistics object
 */
export function getCareerStats(horse: Horse): CareerStats {
  const history = horse.raceHistory || [];
  const stats: CareerStats = {
    starts: history.length,
    wins: 0,
    places: 0,
    shows: 0,
    gradedWins: 0,
    gradedStarts: 0,
    stakesWins: 0,
    g1Wins: 0,
    g2Wins: 0,
    g3Wins: 0,
    earnings: 0,
    turfStarts: 0, turfWins: 0,
    dirtStarts: 0, dirtWins: 0,
    syntheticStarts: 0, syntheticWins: 0,
    sprintStarts: 0, sprintWins: 0,
    classicStarts: 0, classicWins: 0,
    stayerStarts: 0, stayerWins: 0,
  };

  for (const entry of history) {
    const won = entry.position === 1;
    if (won) stats.wins++;
    if (entry.position === 2) stats.places++;
    if (entry.position === 3) stats.shows++;

    if (entry.grade) stats.gradedStarts++;
    if (won && (entry.grade || entry.raceClass === "Stakes" || entry.raceClass === "Group")) stats.stakesWins++;
    if (won && entry.grade) {
      stats.gradedWins++;
      if (entry.grade === "G1") stats.g1Wins++;
      if (entry.grade === "G2") stats.g2Wins++;
      if (entry.grade === "G3") stats.g3Wins++;
    }

    stats.earnings += entry.purseEarned || 0;

    // Surface
    if (entry.surface === "Turf") { stats.turfStarts++; if (won) stats.turfWins++; }
    else if (entry.surface === "Dirt") { stats.dirtStarts++; if (won) stats.dirtWins++; }
    else if (entry.surface) { stats.syntheticStarts++; if (won) stats.syntheticWins++; }

    // Distance
    const dist = entry.distance || 0;
    if (dist < 1400) { stats.sprintStarts++; if (won) stats.sprintWins++; }
    else if (dist < 2000) { stats.classicStarts++; if (won) stats.classicWins++; }
    else if (dist >= 2000) { stats.stayerStarts++; if (won) stats.stayerWins++; }
  }

  return stats;
}

/**
 * Current and potential ability — single-number summary of a horse's level.
 *
 * Current: average of the four stats today.
 * Potential: where those stats can grow to (capped by the horse's potential ceiling).
 * Both are 0–100. Use this for at-a-glance comparisons and for sorting markets/stables.
 *
 * @param horse - The horse to calculate ability for
 * @returns Object with current and potential ability scores
 */
export function getAbility(horse: Horse): { current: number; potential: number } {
  const current = calculateOverallRating(horse);
  // Potential ability is the average ceiling each stat can reach. The
  // potential field caps every stat individually, so a horse can only
  // approach (potential, potential, potential, potential) at best — its
  // potential ability equals horse.potential.
  return { current, potential: horse.potential };
}

/**
 * Letter grade based on a 0–100 ability score.
 *
 * Converts a numeric ability score to a letter grade (S, A, B, C, D, F).
 * Convenient for UI badges.
 *
 * @param score - Ability score (0-100)
 * @returns Letter grade (S, A, B, C, D, or F)
 */
export function abilityGrade(score: number): string {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Determine logical running style from base stats.
 *
 * Calculates the horse's running style based on the balance between
 * speed/acceleration (early bias) and stamina (late bias), with RNG variation.
 *
 * @param stats - Object containing speed, stamina, and acceleration stats
 * @param stats.speed - Horse's top speed potential
 * @param stats.stamina - Horse's endurance potential
 * @param stats.acceleration - Horse's burst potential
 * @param rng - Random number generator
 * @returns Running style (E, EP, P, or S)
 */
export function rollRunningStyle(
  stats: { speed: number; stamina: number; acceleration: number },
  rng: Rng,
): RunningStyle {
  const earlyBias = (stats.speed + stats.acceleration) / 2;
  const lateBias = stats.stamina;
  const tilt = earlyBias - lateBias; // ~ -50..+50
  const r = rng.next() * 100 - tilt; // tilt shifts the distribution
  if (r < 25) return "E";
  if (r < 55) return "EP";
  if (r < 80) return "P";
  return "S";
}
