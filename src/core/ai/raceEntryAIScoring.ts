/**
 * raceEntryAIScoring.ts - Strategic entry score calculation
 *
 * Extracted from raceEntryAI.ts for modularity.
 */

import type { Horse, Race, Stable } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { getSuccessRate } from "./learningModule";
import { calculateRaceSuitability } from "@/core/race/entryScoring";
import { calculateTrackGeometryScore, calculateGradientScore } from "@/core/race/trackGeometry";
import { applyPersonalityModifiers } from "@/core/stable/personalityModifiers";
import type { RaceEntryAIState } from "./raceEntryAITypes";

/**
 * Calculate strategic entry score for a horse in a race.
 *
 * @param aiState - Current race entry AI state
 * @param horse - The horse to evaluate
 * @param race - The race to evaluate
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @param horseMap - Optional map of all horses for competitor quality analysis
 * @returns Strategic entry score
 */
export function calculateStrategicEntryScore(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
  horseMap?: Map<string, Horse>,
): number {
  let score = calculateRaceSuitability(horse, race, stable);

  score += calculateTrackGeometryScore(horse, race);
  score += calculateGradientScore(horse, race);

  score = applyPersonalityModifiers(score, horse, race, stable);

  const contextKey = `${race.distance}:${race.surface || "unknown"}:${race.graded?.grade || "open"}`;
  const successRate = getSuccessRate(aiState.learningState, "race_entry", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 20;
  score += adaptiveBonus;

  const strategicValue = evaluateStrategicValue(aiState, horse, race, currentDay, horseMap);
  score += strategicValue;

  if (horse.lastRaceDay !== undefined) {
    const daysSinceLastRace = currentDay - horse.lastRaceDay;
    const minRestDays =
      stable.personality === "aggressive" || stable.personality === "win-now"
        ? 7
        : stable.personality === "conservative" || stable.personality === "prestige"
          ? 21
          : 14;
    if (daysSinceLastRace < minRestDays) {
      const restRatio = daysSinceLastRace / minRestDays;
      const restPenalty = (1 - restRatio) * 15;
      score -= restPenalty;
    }
  }

  return score;
}

/**
 * Evaluate strategic value of entering a race.
 *
 * @param aiState - Current race entry AI state
 * @param horse - The horse to evaluate
 * @param race - The race to evaluate
 * @param currentDay - Current game day
 * @param horseMap - Optional map of all horses for competitor quality analysis
 * @returns Strategic value score
 */
function evaluateStrategicValue(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  currentDay: number,
  horseMap?: Map<string, Horse>,
): number {
  let strategicValue = 0;

  const devTrack = aiState.strategicPlan.horseDevelopment[horse.id];
  if (devTrack) {
    if (race.graded?.grade === devTrack.targetGrade) {
      strategicValue += 15;
    }

    const daysToPeak = devTrack.projectedPeak - currentDay;
    if (daysToPeak >= 0 && daysToPeak <= 60) {
      strategicValue += 10;
    }
  }

  if (race.entries.length > 0 && horseMap) {
    let totalQuality = 0;
    let competitorCount = 0;
    for (const entry of race.entries) {
      if (entry.horseId === horse.id) continue;
      const competitor = horseMap.get(entry.horseId);
      if (competitor) {
        totalQuality += calculateOverallRating(competitor);
        competitorCount++;
      }
    }
    const avgCompetitorQuality = competitorCount > 0 ? totalQuality / competitorCount : 50;

    if (avgCompetitorQuality > 80) {
      strategicValue -= 10;
    }
  } else if (race.entries.length > 0) {
    const avgCompetitorQuality = 50;
    if (avgCompetitorQuality > 80) {
      strategicValue -= 10;
    }
  }

  const raceBudget = aiState.strategicPlan.budgetAllocation[race.id] || 0;
  if (race.purse > raceBudget * 2 && raceBudget > 0) {
    strategicValue -= 5;
  }

  return strategicValue;
}
