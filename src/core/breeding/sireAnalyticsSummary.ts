/**
 * sireAnalyticsSummary.ts - Analytics summary, crop classification, and narrative
 *
 * Extracted from sireAnalytics.ts for modularity.
 */

import type { Horse } from "@/game/types";
import { getFoalsBy } from "./lineage";
import type { SireAnalytics, CropTier } from "./sireAnalyticsTypes";
import {
  calculateAei,
  calculateCi,
  classifySire,
  getSireSurfaceBias,
  getSireDistancePreference,
  calculateProgenyWinPercentage,
} from "./sireAnalyticsMetrics";

/**
 * Get sire analytics summary.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns SireAnalytics object with all metrics
 */
export function getSireAnalytics(
  stallion: Horse,
  allHorses: Horse[],
  industryMeanEarnings: number,
): SireAnalytics {
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

/**
 * Classify a stallion by the maturity of his crops.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @returns Crop tier classification
 */
export function classifyStallion(stallion: Horse, allHorses: Horse[]): CropTier {
  if (!stallion.stud?.atStud) return "unproven";
  const foals = getFoalsBy(
    { horses: Object.fromEntries(allHorses.map((h) => [h.id, h])) },
    stallion.id,
  );
  if (foals.length === 0) return "unproven";

  const racingAgeFoals = foals.filter((f) => f.age >= 2);
  if (racingAgeFoals.length === 0) return "unproven";

  const oldestFoalAge = Math.max(...foals.map((f) => f.age));
  if (oldestFoalAge <= 3) return "freshman";
  if (oldestFoalAge === 4) return "second-crop";
  return "established";
}

/**
 * Generate editorial-style narrative for a stallion.
 *
 * @param stallion - The stallion horse
 * @param allHorses - All horses in the game state
 * @param industryMeanEarnings - Industry mean earnings for comparison
 * @returns Narrative string for display
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
