/**
 * sireAnalytics.ts - Stallion performance analytics
 *
 * This file provides analytics functions for evaluating stallion performance including
 * Average Earnings Index (AEI), Comparable Index (CI), classification, surface bias,
 * distance preference, and crop maturity classification.
 *
 * Dependencies: @/game/types (Horse), ./lineage (getRunnersBy, foalLifetimeEarnings, getFoalsBy)
 * Related files: stallions.ts (uses analytics for fee calculation), leaderboardService.ts (uses for rankings)
 */

import type { Horse } from "@/game/types";
import { getRunnersBy, foalLifetimeEarnings, getFoalsBy } from "./lineage";

/**
 * Calculate Average Earnings Index (AEI) for a stallion.
 *
 * AEI measures the average earnings of a stallion's progeny relative to the industry mean.
 * Formula: (Progeny Average Earnings / Industry Mean Earnings) × 100
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns AEI value
 *
 * @example
 * const aei = calculateAei(stallion, allHorses, industryMean);
 */
export function calculateAei(
  stallion: Horse,
  allHorses: Horse[],
  industryMeanEarnings: number,
): number {
  if (!stallion.stud || !stallion.stud.lifetimeFoals) return 0;

  const runners = getRunnersBy({ horses: allHorses }, stallion.id);

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
 * CI compares a stallion's progeny performance to other stallions with similar mated mares.
 * Formula: (Progeny Average Earnings / Comparable Sires' Progeny Average Earnings) × 100
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns CI value
 *
 * @example
 * const ci = calculateCi(stallion, allHorses, industryMean);
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
  return Math.round(ci * 10) / 10; // Round to 1 decimal
}

/**
 * Classify a stallion based on their AEI/CI performance.
 *
 * Returns a classification tier based on progeny performance metrics.
 * Classifications: elite (AEI > 2.0, CI > 1.0), premium (AEI > 1.5, CI > 0.8),
 * solid (AEI > 1.0, CI > 0.5), developing (AEI > 0.5, CI > 0.3), unproven.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns Sire classification tier
 *
 * @example
 * const classification = classifySire(stallion, allHorses, industryMean);
 */
export type SireClassification =
  | "elite" // AEI > 2.0, CI > 1.0
  | "premium" // AEI > 1.5, CI > 0.8
  | "solid" // AEI > 1.0, CI > 0.5
  | "developing" // AEI > 0.5, CI > 0.3
  | "unproven"; // AEI <= 0.5 or insufficient data

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
 * Analyzes progeny race results to determine if the stallion produces horses
 * that perform better on dirt, turf, synthetic, or are balanced.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @returns Surface bias classification
 *
 * @example
 * const bias = getSireSurfaceBias(stallion, allHorses);
 */
export type SurfaceBias = "dirt" | "turf" | "synthetic" | "balanced";

export function getSireSurfaceBias(stallion: Horse, allHorses: Horse[]): SurfaceBias {
  const runners = getRunnersBy({ horses: allHorses }, stallion.id);
  if (runners.length < 5) {
    // Fallback to bloodline-based for insufficient data
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
    for (const race of foal.raceHistory) {
      if (!race.surface) continue;
      if (race.surface === "Turf") {
        turfStarts++;
        if (race.position === 1) turfWins++;
      } else if (race.surface === "Dirt") {
        dirtStarts++;
        if (race.position === 1) dirtWins++;
      } else {
        syntheticStarts++;
        if (race.position === 1) syntheticWins++;
      }
    }
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
 * Analyzes progeny race results to determine if the stallion produces horses
 * that perform better at sprint, classic, stayer, or versatile distances.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @returns Distance preference classification
 *
 * @example
 * const preference = getSireDistancePreference(stallion, allHorses);
 */
export type DistancePreference = "sprint" | "classic" | "stayer" | "versatile";

export function getSireDistancePreference(stallion: Horse, allHorses: Horse[]): DistancePreference {
  const runners = getRunnersBy({ horses: allHorses }, stallion.id);
  if (runners.length < 5) return "versatile";

  let sprintWins = 0,
    classicWins = 0,
    stayerWins = 0;
  let sprintStarts = 0,
    classicStarts = 0,
    stayerStarts = 0;

  for (const foal of runners) {
    for (const race of foal.raceHistory) {
      const dist = race.distance || 0;
      if (dist < 1400) {
        sprintStarts++;
        if (race.position === 1) sprintWins++;
      } else if (dist < 2000) {
        classicStarts++;
        if (race.position === 1) classicWins++;
      } else {
        stayerStarts++;
        if (race.position === 1) stayerWins++;
      }
    }
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
 * Returns the percentage of progeny that are stakes winners.
 *
 * @param stallion - The stallion horse
 * @returns Win percentage (0-100)
 *
 * @example
 * const winPct = calculateProgenyWinPercentage(stallion);
 */
export function calculateProgenyWinPercentage(stallion: Horse): number {
  if (!stallion.stud || !stallion.stud.lifetimeFoals) return 0;

  // Simplified calculation using stakes winners as proxy for wins
  const stakesWinners = stallion.stud.lifetimeStakesFoals || 0;
  const totalFoals = stallion.stud.lifetimeFoals;

  const winPercentage = (stakesWinners / totalFoals) * 100;
  return Math.round(winPercentage * 10) / 10; // Round to 1 decimal
}

/**
 * Get sire analytics summary.
 *
 * Returns a comprehensive analytics object containing all key metrics
 * for evaluating stallion performance.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns SireAnalytics object with all metrics
 *
 * @example
 * const analytics = getSireAnalytics(stallion, allHorses, industryMean);
 */
export interface SireAnalytics {
  stallionId: string;
  stallionName: string;
  aei: number;
  ci: number;
  classification: SireClassification;
  surfaceBias: SurfaceBias;
  distancePreference: DistancePreference;
  progenyWinPercentage: number;
  lifetimeFoals: number;
  lifetimeStakesFoals: number;
  lifetimeG1Foals: number;
  standingFee: number;
}

export function getSireAnalytics(
  stallion: Horse,
  allHorses: Horse[],
  industryMeanEarnings: number,
): SireAnalytics {
  const allSires = allHorses.filter((h) => h.stud?.atStud);
  return {
    stallionId: stallion.id,
    stallionName: stallion.name,
    aei: calculateAei(stallion, allHorses, industryMeanEarnings),
    ci: calculateCi(stallion, allHorses, industryMeanEarnings),
    classification: classifySire(stallion, allHorses, industryMeanEarnings),
    surfaceBias: getSireSurfaceBias(stallion, allHorses),
    distancePreference: getSireDistancePreference(stallion, allHorses),
    progenyWinPercentage: calculateProgenyWinPercentage(stallion),
    lifetimeFoals: stallion.stud?.lifetimeFoals || 0,
    lifetimeStakesFoals: stallion.stud?.lifetimeStakesFoals || 0,
    lifetimeG1Foals: stallion.stud?.lifetimeG1Foals || 0,
    standingFee: stallion.stud?.standingFee || 0,
  };
}

// ----------------------------------------------------------------------------
// Crop classification — categorize stallions by how mature their progeny are
// ----------------------------------------------------------------------------

export type CropTier =
  | "freshman" // first crop are 2-3yo, racing this season
  | "second-crop" // oldest crop is 4yo
  | "established" // 3+ crops have raced
  | "unproven"; // no progeny of racing age yet

// Classify a stallion by the maturity of his crops. Looks at the ages of
// his foals in the live horses array. Freshman = first crop is racing age
// for the first time this season; second-crop = oldest crop is now 4yo
// (at least one full season of results); established = 3+ crops on record.
/**
 * Classify a stallion by the maturity of his crops.
 *
 * Returns the crop tier based on the ages of the stallion's foals:
 * freshman (first crop 2-3yo), second-crop (oldest 4yo), established (3+ crops),
 * unproven (no racing-age progeny).
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @returns Crop tier classification
 *
 * @example
 * const tier = classifyStallion(stallion, allHorses);
 */
export function classifyStallion(stallion: Horse, allHorses: Horse[]): CropTier {
  if (!stallion.stud?.atStud) return "unproven";
  const foals = getFoalsBy({ horses: allHorses }, stallion.id);
  if (foals.length === 0) return "unproven";

  const racingAgeFoals = foals.filter((f) => f.age >= 2);
  if (racingAgeFoals.length === 0) return "unproven";

  const oldestFoalAge = Math.max(...foals.map((f) => f.age));
  if (oldestFoalAge <= 3) return "freshman";
  if (oldestFoalAge === 4) return "second-crop";
  return "established";
}

// ----------------------------------------------------------------------------
// Auto-narrative — editorial-style one-liners templated from raw stats
// ----------------------------------------------------------------------------

// Build a one-line summary picking the most-notable angle: sire's hot crop,
// his value-vs-fee ratio, his surface dominance, his Group 1 strike rate, etc.
// Lightweight templating — no heavy NLG. Returns a string ready for display
// in the leaderboard.
/**
 * Generate editorial-style narrative for a stallion.
 *
 * Builds a one-line summary picking the most notable angle: sire's hot crop,
 * value-vs-fee ratio, surface dominance, Group 1 strike rate, etc. Uses lightweight
 * templating for display in leaderboards.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns Narrative string for display
 *
 * @example
 * const narrative = generateSireNarrative(stallion, allHorses, industryMean);
 */
export function generateSireNarrative(
  stallion: Horse,
  allHorses: Horse[],
  industryMeanEarnings: number,
): string {
  const a = getSireAnalytics(stallion, allHorses, industryMeanEarnings);
  const tier = classifyStallion(stallion, allHorses);
  const fee = a.standingFee;
  const stakesFoals = a.lifetimeStakesFoals;
  const g1Foals = a.lifetimeG1Foals;

  // Most-notable picker — first match wins.
  if (tier === "freshman" && stakesFoals >= 2) {
    return `Hottest freshman sire: ${stakesFoals} stakes winners from his first crop.`;
  }
  if (tier === "freshman") {
    return `Quietly intriguing freshman sire — first crop hitting the track now.`;
  }
  if (g1Foals >= 3) {
    return `Proven Group 1 producer — ${g1Foals} elite winners and counting.`;
  }
  if (g1Foals >= 1) {
    return `Has sired ${g1Foals} Group 1 winner${g1Foals > 1 ? "s" : ""}; AEI ${a.aei.toFixed(1)}.`;
  }
  if (fee <= 5000 && stakesFoals >= 2) {
    return `Best value under $5k — outperforming his fee ${stakesFoals}× over.`;
  }
  if (fee >= 50000 && stakesFoals === 0) {
    return `Premium fee, modest progeny so far — keep watching.`;
  }
  if (a.surfaceBias === "turf" && stakesFoals >= 1) {
    return `Turf specialist — ${stakesFoals} stakes winners on grass.`;
  }
  if (a.surfaceBias === "dirt" && stakesFoals >= 1) {
    return `Dirt specialist — ${stakesFoals} stakes winners on the main track.`;
  }
  if (tier === "second-crop") {
    return `Second-crop watch — early progeny showed promise; this season tells the story.`;
  }
  if (tier === "established" && stakesFoals === 0) {
    return `Established sire still searching for his breakthrough stakes winner.`;
  }
  return `${a.lifetimeFoals} lifetime foals; ${stakesFoals} stakes winners; AEI ${a.aei.toFixed(1)}.`;
}
