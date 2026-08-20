/**
 * sireAnalyticsMetrics.ts - Core sire performance metrics
 *
 * Extracted from sireAnalytics.ts for modularity.
 * Contains AEI, CI, classification, surface bias, distance preference,
 * and progeny win percentage calculations.
 */

import type { Horse } from "@/game/types";
import { getRunnersBy, foalLifetimeEarnings } from "./lineage";
import { getCareerStats } from "@/core/horse/stats";
import type { SireClassification, SurfaceBias, DistancePreference } from "./sireAnalyticsTypes";

/**
 * Calculate Average Earnings Index (AEI) for a stallion.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns AEI value
 */
export function calculateAei(
  stallion: Horse,
  allHorses: Horse[],
  industryMeanEarnings: number,
): number {
  if (!stallion.stud || !stallion.stud.lifetimeFoals) return 0;

  const runners = getRunnersBy(
    { horses: Object.fromEntries(allHorses.map((h) => [h.id, h])) },
    stallion.id,
  );

  if (runners.length === 0) return 0;

  const totalProgenyEarnings = runners.reduce((sum, f) => sum + foalLifetimeEarnings(f), 0);
  const avgProgenyEarnings = totalProgenyEarnings / runners.length;

  if (industryMeanEarnings === 0) return 0;

  const aei = (avgProgenyEarnings / industryMeanEarnings) * 100;
  return Math.round(aei * 10) / 10;
}

/**
 * Calculate Comparable Index (CI) for a stallion.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns CI value
 */
export function calculateCi(
  stallion: Horse,
  allHorses: Horse[],
  industryMeanEarnings: number,
): number {
  if (!stallion.stud || !stallion.stud.lifetimeFoals) return 0;

  const aei = calculateAei(stallion, allHorses, industryMeanEarnings);
  const allSires = allHorses.filter((h) => h.stud?.atStud);
  const averageAei =
    allSires.reduce((sum, s) => sum + calculateAei(s, allHorses, industryMeanEarnings), 0) /
    allSires.length;

  if (averageAei === 0) return 0;

  const ci = (aei / averageAei) * 100;
  return Math.round(ci * 10) / 10;
}

/**
 * Classify a stallion based on their AEI/CI performance.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns Sire classification tier
 */
export function classifySire(
  stallion: Horse,
  allHorses: Horse[],
  industryMeanEarnings: number,
): SireClassification {
  if (!stallion.stud || stallion.stud.lifetimeFoals < 5) return "unproven";

  const aei = calculateAei(stallion, allHorses, industryMeanEarnings);
  const ci = calculateCi(stallion, allHorses, industryMeanEarnings);

  if (aei > 2.0 && ci > 1.0) return "elite";
  if (aei > 1.5 && ci > 0.8) return "premium";
  if (aei > 1.0 && ci > 0.5) return "solid";
  if (aei > 0.5 && ci > 0.3) return "developing";

  return "unproven";
}

/**
 * Get surface bias for a stallion based on progeny performance.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @returns Surface bias classification
 */
export function getSireSurfaceBias(stallion: Horse, allHorses: Horse[]): SurfaceBias {
  const runners = getRunnersBy(
    { horses: Object.fromEntries(allHorses.map((h) => [h.id, h])) },
    stallion.id,
  );
  if (runners.length < 5) {
    if (stallion.bloodline) {
      const bloodline = stallion.bloodline.toLowerCase();
      if (bloodline.includes("northern dancer") || bloodline.includes("sadler's wells")) {
        return "turf";
      }
      if (bloodline.includes("mr. prospector") || bloodline.includes("storm cat")) {
        return "dirt";
      }
    }
    return "balanced";
  }

  let turfWins = 0,
    dirtWins = 0,
    syntheticWins = 0;
  let turfStarts = 0,
    dirtStarts = 0,
    syntheticStarts = 0;
  for (const foal of runners) {
    const cs = getCareerStats(foal);
    turfWins += cs.turfWins;
    turfStarts += cs.turfStarts;
    dirtWins += cs.dirtWins;
    dirtStarts += cs.dirtStarts;
    syntheticWins += cs.syntheticWins;
    syntheticStarts += cs.syntheticStarts;
  }
  const turfRate = turfStarts > 0 ? turfWins / turfStarts : 0;
  const dirtRate = dirtStarts > 0 ? dirtWins / dirtStarts : 0;
  const syntheticRate = syntheticStarts > 0 ? syntheticWins / syntheticStarts : 0;

  if (turfRate > 0.25 && turfRate > dirtRate * 1.5) return "turf";
  if (dirtRate > 0.25 && dirtRate > turfRate * 1.5) return "dirt";
  if (syntheticRate > 0.25) return "synthetic";
  return "balanced";
}

/**
 * Get distance preference for a stallion based on progeny performance.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @returns Distance preference classification
 */
export function getSireDistancePreference(stallion: Horse, allHorses: Horse[]): DistancePreference {
  const runners = getRunnersBy(
    { horses: Object.fromEntries(allHorses.map((h) => [h.id, h])) },
    stallion.id,
  );
  if (runners.length < 5) return "versatile";

  let sprintWins = 0,
    classicWins = 0,
    stayerWins = 0;
  let sprintStarts = 0,
    classicStarts = 0,
    stayerStarts = 0;
  for (const foal of runners) {
    const cs = getCareerStats(foal);
    sprintWins += cs.sprintWins;
    sprintStarts += cs.sprintStarts;
    classicWins += cs.classicWins;
    classicStarts += cs.classicStarts;
    stayerWins += cs.stayerWins;
    stayerStarts += cs.stayerStarts;
  }
  const sprintRate = sprintStarts > 0 ? sprintWins / sprintStarts : 0;
  const classicRate = classicStarts > 0 ? classicWins / classicStarts : 0;
  const stayerRate = stayerStarts > 0 ? stayerWins / stayerStarts : 0;

  if (sprintRate > 0.2 && sprintRate > classicRate * 1.3) return "sprint";
  if (stayerRate > 0.2 && stayerRate > classicRate * 1.3) return "stayer";
  if (classicRate > 0.15) return "classic";
  return "versatile";
}

/**
 * Calculate win percentage for a stallion's progeny.
 *
 * @param stallion - The stallion horse
 * @returns Win percentage (0-100)
 */
export function calculateProgenyWinPercentage(stallion: Horse): number {
  if (!stallion.stud || !stallion.stud.lifetimeFoals) return 0;

  const stakesWinners = stallion.stud.lifetimeStakesFoals || 0;
  const totalFoals = stallion.stud.lifetimeFoals;

  const winPercentage = (stakesWinners / totalFoals) * 100;
  return Math.round(winPercentage * 10) / 10;
}
