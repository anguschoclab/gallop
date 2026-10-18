/**
 * raceEntryAIScoring.ts - Strategic entry score calculation
 *
 * Extracted from raceEntryAI.ts for modularity.
 */

import type { Horse, Race, Stable } from "@/platform/game/types";
import { calculateOverallRating } from "@/domains/horse/simulation/stats";
import { getSuccessRate } from "./learningModule";
import { calculateRaceSuitability } from "@/domains/race/simulation/entryScoring";
import { calculateTrackGeometryScore, calculateGradientScore } from "@/domains/race/simulation/trackGeometry";
import { applyPersonalityModifiers } from "@/domains/stable/simulation/personalityModifiers";
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
/**
 * Precomputed per-race competitor-quality aggregates. Building this once per
 * race per day replaces the O(entries) rescan that otherwise runs once per
 * (stable, horse, race) evaluation. `byHorse` preserves the original loop's
 * self-exclusion semantics exactly, including duplicate entries.
 */
export interface RaceCompetitorIndex {
  /** Sum of overall ratings across resolvable entries. */
  sum: number;
  /** Number of resolvable entries. */
  count: number;
  /** Entry frequency + rating per horseId for self-exclusion. */
  byHorse: Map<string, { n: number; rating: number }>;
}

/**
 * Build the competitor-quality aggregates for one race's current entries.
 * @param race - The race whose entries to index.
 * @param horseMap - Map of all horses for entry resolution.
 */
export function buildRaceCompetitorIndex(
  race: Race,
  horseMap: Map<string, Horse>,
): RaceCompetitorIndex {
  const byHorse = new Map<string, { n: number; rating: number }>();
  let sum = 0;
  let count = 0;
  for (const entry of race.entries) {
    const competitor = horseMap.get(entry.horseId);
    if (!competitor) continue;
    const rating = calculateOverallRating(competitor);
    sum += rating;
    count++;
    const prev = byHorse.get(entry.horseId);
    byHorse.set(entry.horseId, { n: (prev?.n ?? 0) + 1, rating });
  }
  return { sum, count, byHorse };
}

export function calculateStrategicEntryScore(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
  horseMap?: Map<string, Horse>,
  competitorIndex?: RaceCompetitorIndex,
): number {
  let score = calculateRaceSuitability(horse, race, stable);

  score += calculateTrackGeometryScore(horse, race);
  score += calculateGradientScore(horse, race);

  score = applyPersonalityModifiers(score, horse, race, stable);

  const contextKey = `${race.distance}:${race.surface || "unknown"}:${race.graded?.grade || "open"}`;
  const successRate = getSuccessRate(aiState.learningState, "race_entry", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 20;
  score += adaptiveBonus;

  const strategicValue = evaluateStrategicValue(
    aiState,
    horse,
    race,
    currentDay,
    horseMap,
    competitorIndex,
  );
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
 * @param competitorIndex - Optional precomputed per-race competitor quality index
 * @returns Strategic value score
 */
function evaluateStrategicValue(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  currentDay: number,
  horseMap?: Map<string, Horse>,
  competitorIndex?: RaceCompetitorIndex,
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

  if (race.entries.length > 0 && (horseMap || competitorIndex)) {
    let totalQuality = 0;
    let competitorCount = 0;
    if (competitorIndex) {
      const self = competitorIndex.byHorse.get(horse.id);
      totalQuality = competitorIndex.sum - (self ? self.n * self.rating : 0);
      competitorCount = competitorIndex.count - (self?.n ?? 0);
    } else {
      for (const entry of race.entries) {
        if (entry.horseId === horse.id) continue;
        const competitor = horseMap!.get(entry.horseId);
        if (competitor) {
          totalQuality += calculateOverallRating(competitor);
          competitorCount++;
        }
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
