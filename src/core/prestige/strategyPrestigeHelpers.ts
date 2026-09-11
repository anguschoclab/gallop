/**
 * strategyPrestigeHelpers.ts - Prestige calculations and categorization for horse campaigns
 */

import {
  getRacecoursePrestige,
  getRacecoursePrestigeByName,
  RACECOURSE_FLOOR_PRESTIGE,
} from "./racecoursePrestige";
import type { CampaignRaceSlot, Race } from "@/game/types";

export type PrestigeTier = "Cathedral" | "Premier" | "Metropolitan" | "Circuit";

/**
 * Returns the prestige tier classification for a 0-100 score.
 * @param score
 */
export function getPrestigeTier(score: number): PrestigeTier {
  if (score >= 90) return "Cathedral";
  if (score >= 70) return "Premier";
  if (score >= 45) return "Metropolitan";
  return "Circuit";
}

/**
 * Returns Tailwind badge color classes for a prestige tier.
 * @param tier
 */
export function getPrestigeTierBadgeClass(tier: PrestigeTier): string {
  switch (tier) {
    case "Cathedral":
      return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    case "Premier":
      return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    case "Metropolitan":
      return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    case "Circuit":
      return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  }
}

/**
 * Calculates the prestige score for a specific venue by name or ID.
 * @param trackName
 * @param trackId
 */
export function calculateVenuePrestige(trackName?: string, trackId?: string): number {
  let score = trackName ? getRacecoursePrestigeByName(trackName) : RACECOURSE_FLOOR_PRESTIGE;
  if (score === RACECOURSE_FLOOR_PRESTIGE && trackId) {
    score = getRacecoursePrestige(trackId);
  }
  return score;
}

/**
 * Calculates the average prestige of racecourse venues across planned campaign slots.
 * @param slots
 * @param getRace
 */
export function calculateAverageCampaignPrestige(
  slots: CampaignRaceSlot[],
  getRace: (raceId: string) => Race | undefined,
): number {
  if (slots.length === 0) return RACECOURSE_FLOOR_PRESTIGE;

  let totalScore = 0;
  let counted = 0;

  for (const slot of slots) {
    if (!slot.raceId) continue;
    const race = getRace(slot.raceId);
    if (!race) continue;
    const trackName = race.graded?.track || (race as { track?: string }).track;
    const score = calculateVenuePrestige(trackName, race.trackId);
    totalScore += score;
    counted++;
  }

  if (counted === 0) return RACECOURSE_FLOOR_PRESTIGE;
  return Math.round(totalScore / counted);
}
