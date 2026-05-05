import type { Horse } from "@/game/types";
import { foalLifetimeEarnings } from "./lineage";

/**
 * Compute the industry mean earnings for all racing-age horses.
 * This is the baseline used for AEI (Average Earnings Index) calculation.
 * A sire's AEI = (progeny average earnings / industry mean) × 100
 */
export function computeIndustryMeanEarnings(allHorses: Horse[]): number {
  // Filter for racing-age horses (2+) that have actually raced
  const runners = allHorses.filter((h) => h.age >= 2 && h.raceHistory.length > 0);

  if (runners.length === 0) return 0;

  const totalEarnings = runners.reduce((sum, h) => sum + foalLifetimeEarnings(h), 0);
  return totalEarnings / runners.length;
}
