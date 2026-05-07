import type { Horse, Race, Stable } from "@/game/types";
import type { Rng } from "@/game/rng";
import {
  getPersonalityAIState,
  calculateUtilityScore,
  calculateStrategicScore,
} from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import { calculateRaceSuitability } from "@/core/race/entryScoring";
import { calculateTrackGeometryScore, calculateGradientScore } from "@/core/race/trackGeometry";
import { applyPersonalityModifiers, getFormTolerance } from "@/core/stable/personalityModifiers";

/**
 * Strategic Race Entry System
 * Long-term race schedule planning, horse development tracking, multi-race strategy optimization
 */

export interface RaceEntryAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  strategicPlan: StrategicPlan;
}

export interface StrategicPlan {
  targetRaces: Array<{
    raceId: string;
    day: number;
    priority: number;
    horseId?: string;
  }>;
  horseDevelopment: Map<string, HorseDevelopmentTrack>;
  budgetAllocation: Map<string, number>; // raceId -> budget
}

export interface HorseDevelopmentTrack {
  horseId: string;
  targetGrade: string;
  currentProgress: number;
  recentRaces: Array<{ raceId: string; position: number; beyer: number }>;
  projectedPeak: number;
}

/**
 * Create AI state for race entry decisions
 */
export function createRaceEntryAIState(stable: Stable): RaceEntryAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    strategicPlan: {
      targetRaces: [],
      horseDevelopment: new Map(),
      budgetAllocation: new Map(),
    },
  };
}

/**
 * Calculate strategic entry score for a horse in a race
 * Combines suitability, learning, and strategic planning
 */
export function calculateStrategicEntryScore(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
): number {
  // Base suitability score
  let score = calculateRaceSuitability(horse, race, stable);

  // Add track geometry and gradient scores
  score += calculateTrackGeometryScore(horse, race);
  score += calculateGradientScore(horse, race);

  // Apply personality modifiers
  score = applyPersonalityModifiers(score, horse, race, stable);

  // Learning-based adjustment
  const contextKey = `${race.distance}:${race.surface || "unknown"}:${race.graded?.grade || "open"}`;
  const successRate = getSuccessRate(aiState.learningState, "race_entry", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 20; // -10 to +10 based on learning
  score += adaptiveBonus;

  // Strategic planning adjustment
  const strategicValue = evaluateStrategicValue(aiState, horse, race, currentDay);
  score += strategicValue;

  return score;
}

/**
 * Evaluate strategic value of entering a race
 * Considers long-term goals, horse development, and competitive positioning
 */
function evaluateStrategicValue(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  currentDay: number,
): number {
  let strategicValue = 0;

  // Check if race aligns with horse development plan
  const devTrack = aiState.strategicPlan.horseDevelopment.get(horse.id);
  if (devTrack) {
    // Bonus for races that advance development goals
    if (race.graded?.grade === devTrack.targetGrade) {
      strategicValue += 15;
    }

    // Check if horse is approaching projected peak
    const daysToPeak = devTrack.projectedPeak - currentDay;
    if (daysToPeak >= 0 && daysToPeak <= 60) {
      strategicValue += 10; // Bonus for targeting peak form
    }
  }

  // Competitive positioning - avoid races with too many top competitors
  if (race.entries.length > 0) {
    const competitorQuality =
      race.entries.reduce((sum, e) => {
        // In real implementation, would look up horse stats
        return sum + 50; // Placeholder
      }, 0) / race.entries.length;

    if (competitorQuality > 80) {
      strategicValue -= 10; // Penalty for very competitive fields
    }
  }

  // Budget consideration
  const raceBudget = aiState.strategicPlan.budgetAllocation.get(race.id) || 0;
  if (race.purse > raceBudget * 2) {
    strategicValue -= 5; // Penalty for overspending on single race
  }

  return strategicValue;
}

/**
 * Update horse development tracking after a race
 */
export function updateHorseDevelopment(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  position: number,
  beyer: number,
): RaceEntryAIState {
  const devTrack = aiState.strategicPlan.horseDevelopment.get(horse.id) || {
    horseId: horse.id,
    targetGrade: race.graded?.grade || "open",
    currentProgress: 0,
    recentRaces: [],
    projectedPeak: horse.age < 4 ? horse.age * 365 + 365 : horse.age * 365,
  };

  // Add race result
  devTrack.recentRaces.push({ raceId: race.id, position, beyer });
  if (devTrack.recentRaces.length > 5) {
    devTrack.recentRaces = devTrack.recentRaces.slice(-5);
  }

  // Update progress based on performance
  if (position <= 3) {
    devTrack.currentProgress += 10;
  } else if (position <= 5) {
    devTrack.currentProgress += 5;
  }

  // Adjust target grade if performing well
  if (devTrack.currentProgress > 80 && devTrack.targetGrade !== "G1") {
    const grades = ["open", "G3", "G2", "G1"];
    const currentIndex = grades.indexOf(devTrack.targetGrade);
    if (currentIndex < grades.length - 1) {
      devTrack.targetGrade = grades[currentIndex + 1];
      devTrack.currentProgress = 0; // Reset progress for new goal
    }
  }

  aiState.strategicPlan.horseDevelopment.set(horse.id, devTrack);

  return aiState;
}

/**
 * Record race entry outcome for learning
 */
export function recordRaceEntryOutcome(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  currentDay: number,
  success: boolean,
  position?: number,
): RaceEntryAIState {
  const contextKey = `${race.distance}:${race.surface || "unknown"}:${race.graded?.grade || "open"}`;
  const value = success && position ? (10 - position) * 10 : 0;

  aiState.learningState = recordOutcome(
    aiState.learningState,
    "race_entry",
    contextKey,
    success,
    value,
    Date.now(),
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  // Update personality state if successful
  if (success) {
    // Note: Using learning state for now, personality state updates would need proper context
    // aiState.personalityState would be updated here if we had the full context
  }

  return aiState;
}

/**
 * Generate multi-race entry strategy for a stable
 * Plans entries across multiple upcoming races
 */
export function generateMultiRaceStrategy(
  aiState: RaceEntryAIState,
  stable: Stable,
  horses: Horse[],
  races: Race[],
  currentDay: number,
  daysAhead: number,
): Map<string, string[]> {
  const strategy = new Map<string, string[]>(); // raceId -> horseIds

  // Filter upcoming races
  const upcomingRaces = races.filter(
    (r) => r.day > currentDay && r.day <= currentDay + daysAhead && !r.resolved,
  );

  // Sort races by day and priority
  upcomingRaces.sort((a, b) => {
    const dayDiff = a.day - b.day;
    if (dayDiff !== 0) return dayDiff;
    return (b.purse || 0) - (a.purse || 0); // Higher purse priority on same day
  });

  // Assign horses to races based on strategic fit
  for (const race of upcomingRaces) {
    const candidates = horses
      .filter((h) => h.stableId === stable.id)
      .map((horse) => ({
        horse,
        score: calculateStrategicEntryScore(aiState, horse, race, stable, currentDay),
      }))
      .filter((c) => c.score > 50) // Minimum threshold
      .sort((a, b) => b.score - a.score);

    // Select top candidates (max 2 per race)
    const selected = candidates.slice(0, 2).map((c) => c.horse.id);
    if (selected.length > 0) {
      strategy.set(race.id, selected);
    }
  }

  return strategy;
}

/**
 * Adapt strategy based on learning outcomes
 */
export function adaptStrategy(aiState: RaceEntryAIState, currentDay: number): RaceEntryAIState {
  // Prune old learning data
  const cutoffDay = currentDay - aiState.personalityState.memoryDepth;
  // Note: learningModule.pruneOldOutcomes would be called here

  // Adjust strategic thresholds based on learning
  const insights = {
    totalDecisions: aiState.learningState.outcomes.length,
    successRate:
      aiState.learningState.outcomes.length > 0
        ? aiState.learningState.outcomes.filter((o) => o.success).length /
          aiState.learningState.outcomes.length
        : 0.5,
  };

  // If success rate is low, become more conservative
  if (insights.successRate < 0.4 && insights.totalDecisions > 10) {
    aiState.personalityState.strategyConfidence = Math.max(
      0.3,
      aiState.personalityState.strategyConfidence - 0.1,
    );
  }

  return aiState;
}
