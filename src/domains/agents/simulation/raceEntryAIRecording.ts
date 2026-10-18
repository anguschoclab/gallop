/**
 * raceEntryAIRecording.ts - Development tracking, outcome recording, strategy generation
 *
 * Extracted from raceEntryAI.ts for modularity.
 */

import type { Horse, Race, Stable } from "@/game/types";
import { RECENT_RACES_MAX_COUNT } from "@/constants";
import { recordPersonalityOutcome } from "./personalitySystem";
import { recordLearningOutcome } from "./learningModule";
import type { RaceEntryAIState } from "./raceEntryAITypes";
import { calculateStrategicEntryScore } from "./raceEntryAIScoring";

/**
 * Update horse development tracking after a race.
 *
 * @param aiState - Current race entry AI state
 * @param horse - The horse that raced
 * @param race - The race that was run
 * @param position - Final race position
 * @param beyer - Beyer figure from the race
 * @returns Updated race entry AI state
 */
export function updateHorseDevelopment(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  position: number,
  beyer: number,
): RaceEntryAIState {
  const devTrack = aiState.strategicPlan.horseDevelopment[horse.id] || {
    horseId: horse.id,
    targetGrade: race.graded?.grade || "open",
    currentProgress: 0,
    recentRaces: [],
    projectedPeak: horse.age < 4 ? horse.age * 365 + 365 : horse.age * 365,
  };

  const newRecentRaces = [...devTrack.recentRaces, { raceId: race.id, position, beyer }];
  const trimmedRecentRaces =
    newRecentRaces.length > RECENT_RACES_MAX_COUNT
      ? newRecentRaces.slice(-RECENT_RACES_MAX_COUNT)
      : newRecentRaces;

  let currentProgress = devTrack.currentProgress;
  if (position <= 3) {
    currentProgress += 10;
  } else if (position <= 5) {
    currentProgress += 5;
  }

  let targetGrade = devTrack.targetGrade;
  if (currentProgress > 80 && targetGrade !== "G1") {
    const grades = ["open", "G3", "G2", "G1"];
    const currentIndex = grades.indexOf(targetGrade);
    if (currentIndex < grades.length - 1) {
      targetGrade = grades[currentIndex + 1];
      currentProgress = 0;
    }
  }

  const updatedDevTrack = {
    ...devTrack,
    targetGrade,
    currentProgress,
    recentRaces: trimmedRecentRaces,
  };

  return {
    ...aiState,
    strategicPlan: {
      ...aiState.strategicPlan,
      horseDevelopment: {
        ...aiState.strategicPlan.horseDevelopment,
        [horse.id]: updatedDevTrack,
      },
    },
  };
}

/**
 * Record race entry outcome for learning.
 *
 * @param aiState - Current race entry AI state
 * @param horse - The horse that entered the race
 * @param race - The race that was entered
 * @param currentDay - Current game day
 * @param success - Whether the entry was successful
 * @param position - Final race position (optional)
 * @returns Updated race entry AI state
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

  const newPersonalityState = recordPersonalityOutcome(
    aiState.personalityState,
    "race_entry",
    { raceId: race.id, horseId: horse.id },
    success,
    value,
    currentDay,
  );

  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    "race_entry",
    contextKey,
    success,
    value,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  return {
    ...aiState,
    personalityState: newPersonalityState,
    learningState: newLearningState,
  };
}

/**
 * Generate multi-race entry strategy for a stable.
 *
 * @param aiState - Current race entry AI state
 * @param stable - The stable planning entries
 * @param horses - Available horses
 * @param races - Available races
 * @param currentDay - Current game day
 * @param daysAhead - Number of days ahead to plan
 * @returns Strategy mapping race IDs to horse IDs
 */
export function generateMultiRaceStrategy(
  aiState: RaceEntryAIState,
  stable: Stable,
  horses: Horse[],
  races: Race[],
  currentDay: number,
  daysAhead: number,
): Record<string, string[]> {
  const strategy: Record<string, string[]> = {};

  const upcomingRaces = races.filter(
    (r) => r.day > currentDay && r.day <= currentDay + daysAhead && !r.resolved && !r.cancelled,
  );

  upcomingRaces.sort((a, b) => {
    const dayDiff = a.day - b.day;
    if (dayDiff !== 0) return dayDiff;
    return (b.purse || 0) - (a.purse || 0);
  });

  const assignedHorseDays = new Set<string>();

  for (const race of upcomingRaces) {
    const maxPerRace = Math.min(2, race.fieldSize - race.entries.length);
    if (maxPerRace <= 0) continue;

    const candidates = horses
      .filter((h) => h.ownership?.type === "npc" && h.ownership.stableId === stable.id)
      .filter((h) => !assignedHorseDays.has(`${h.id}:${race.day}`))
      .map((horse) => ({
        horse,
        score: calculateStrategicEntryScore(aiState, horse, race, stable, currentDay),
      }))
      .filter((c) => c.score > 50)
      .sort((a, b) => b.score - a.score);

    const selected = candidates.slice(0, maxPerRace).map((c) => c.horse.id);
    if (selected.length > 0) {
      strategy[race.id] = selected;
      for (const horseId of selected) {
        assignedHorseDays.add(`${horseId}:${race.day}`);
      }
    }
  }

  return strategy;
}

/**
 * Adapt strategy based on learning outcomes.
 *
 * @param aiState - Current race entry AI state
 * @param currentDay - Current game day
 * @returns Updated race entry AI state
 */
export function adaptStrategy(aiState: RaceEntryAIState, currentDay: number): RaceEntryAIState {
  const outcomes = aiState.learningState.outcomes;
  const totalDecisions = outcomes.length;
  const successRate =
    totalDecisions > 0 ? outcomes.filter((o) => o.success).length / totalDecisions : 0.5;

  if (successRate < 0.4 && totalDecisions > 10) {
    const newPersonalityState = {
      ...aiState.personalityState,
      strategyConfidence: Math.max(0.3, aiState.personalityState.strategyConfidence - 0.1),
    };
    return {
      ...aiState,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}

/**
 * Check if a race conflicts with a horse's campaign prep schedule.
 *
 * @param horseId - The horse to check
 * @param raceDay - The day of the race being considered
 * @param campaignTargetDays - Array of target race days for this horse's campaign
 * @param prepWindowDays - Days before target race that should be reserved for prep only
 * @returns True if the race conflicts with the campaign schedule
 */
export function conflictsWithCampaignPrep(
  horseId: string,
  raceDay: number,
  campaignTargetDays: number[],
  prepWindowDays = 14,
): boolean {
  for (const targetDay of campaignTargetDays) {
    if (raceDay >= targetDay - prepWindowDays && raceDay < targetDay) {
      return true;
    }
  }
  return false;
}
