/**
 * campaignAI.ts - Campaign AI system (orchestrator)
 *
 * Provides types, state creation, and contender detection.
 * Targeting extracted to: campaignTargeting.ts.
 * Recording/insights extracted to: campaignRecording.ts.
 *
 * Dependencies: @/game/types, @/data/gradedRaces, ./personalitySystem, ./learningModule, @/core/horse/stats, @/core/breeding/archetypes
 * Related files: campaignTargeting.ts, campaignRecording.ts
 */

import type { Horse, Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState, type LearningState } from "./learningModule";
import {
  GRADED_RACES,
  GRADED_RACES_BY_KEY,
  GRADED_RACES_BY_TRIPLECROWN_KEY,
  GRADED_RACES_BY_BC_KEY,
} from "@/data/gradedRaces";
import { calculateOverallRating, calculateRaceRating } from "@/core/horse/stats";
import { getTripleCrownKeysForArchetype } from "@/core/breeding/archetypes";

// Re-exports for backward compatibility
export {
  getOptimalMajorRaceTarget,
  calculateRaceTargetScore,
  shouldTargetMajorRace,
  getPrepRaceStrategy,
  selectPrepRace,
} from "./campaignTargeting";
export {
  recordCampaignDecision,
  recordCampaignOutcome,
  getCampaignInsights,
  decayContenderConfidence,
  coordinateMultiHorsePrep,
} from "./campaignRecording";

export interface CampaignAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  contenderTracking: Record<string, ContenderStatus>;
  campaignHistory: CampaignDecision[];
}

export interface ContenderStatus {
  horseId: string;
  isContender: boolean;
  targetRaces: string[];
  confidence: number;
  lastAssessmentDay: number;
  contenderSeries: Record<
    string,
    {
      isContender: boolean;
      confidence: number;
      targetRaces: string[];
      lastAssessmentDay: number;
    }
  >;
}

export interface CampaignDecision {
  horseId: string;
  raceKey: string;
  targetRaceKey: string;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  success?: boolean;
  position?: number;
  prize?: number;
}

export function createCampaignAIState(stable: Stable): CampaignAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    contenderTracking: {},
    campaignHistory: [],
  };
}

/**
 * Detect if a horse is a contender for major races.
 *
 * Evaluates horses for Triple Crown, Breeders Cup, Dubai World Cup,
 * and other major G1 races based on age, rating, and distance aptitude.
 * Uses stable's breedingArchetype to determine target triple crown series.
 *
 * @param aiState - Current campaign AI state
 * @param horse - The horse to evaluate
 * @param currentDay - Current game day
 * @param stable - The stable making the decision (optional for backward compatibility)
 * @returns Updated campaign AI state with contender status
 */
export function detectContender(
  aiState: CampaignAIState,
  horse: Horse,
  currentDay: number,
  stable?: Stable,
): CampaignAIState {
  const horseRating = calculateOverallRating(horse);
  const avgStat = calculateRaceRating(horse);

  let isContender = false;
  let confidence = 0;
  const targetRaces: string[] = [];
  const contenderSeries: Record<
    string,
    {
      isContender: boolean;
      confidence: number;
      targetRaces: string[];
      lastAssessmentDay: number;
    }
  > = {};

  // Determine target triple crown series based on stable's breeding archetype
  const targetSeriesKeys = stable?.breedingArchetype
    ? getTripleCrownKeysForArchetype(stable.breedingArchetype)
    : [];

  // Triple Crown contender criteria - evaluate all series or target series if specified
  if (horse.age === 3 && avgStat > 70) {
    const tcRaces = Array.from(GRADED_RACES_BY_TRIPLECROWN_KEY.values()).flat();
    for (const race of tcRaces) {
      // If stable has breeding archetype, only evaluate matching series
      if (targetSeriesKeys.length > 0 && !targetSeriesKeys.includes(race.triplecrownKey || "")) {
        continue;
      }

      if (
        horse.distanceAptitude > race.distance - 300 &&
        horse.distanceAptitude < race.distance + 300
      ) {
        targetRaces.push(race.key);
        confidence += 0.2;

        // Track per-series contender status
        const tcKey = race.triplecrownKey || "";
        if (!contenderSeries[tcKey]) {
          contenderSeries[tcKey] = {
            isContender: false,
            confidence: 0,
            targetRaces: [],
            lastAssessmentDay: currentDay,
          };
        }
        contenderSeries[tcKey].targetRaces.push(race.key);
        contenderSeries[tcKey].confidence += 0.2;
      }
    }

    // Mark series as contender if they have enough target races
    for (const tcKey in contenderSeries) {
      if (contenderSeries[tcKey].targetRaces.length >= 2) {
        contenderSeries[tcKey].isContender = true;
        contenderSeries[tcKey].confidence = Math.min(1, contenderSeries[tcKey].confidence + 0.3);
      }
    }

    if (targetRaces.length >= 2) {
      isContender = true;
      confidence = Math.min(1, confidence + 0.3);
    }
  }

  // Breeders Cup contender criteria
  if (horse.age >= 3 && horseRating > 65) {
    const bcRaces = GRADED_RACES_BY_BC_KEY.get("breeders-cup") ?? [];
    for (const race of bcRaces) {
      if (
        horse.distanceAptitude > race.distance - 300 &&
        horse.distanceAptitude < race.distance + 300
      ) {
        targetRaces.push(race.key);
        confidence += 0.15;
      }
    }
    if (targetRaces.length >= 1 && horseRating > 75) {
      isContender = true;
      confidence = Math.min(1, confidence + 0.2);
    }
  }

  // Dubai World Cup contender criteria
  if (horse.age >= 4 && horseRating > 75) {
    const dwcRace = GRADED_RACES_BY_KEY.get("dubai-world-cup");
    if (
      dwcRace &&
      horse.distanceAptitude > dwcRace.distance - 300 &&
      horse.distanceAptitude < dwcRace.distance + 300
    ) {
      targetRaces.push(dwcRace.key);
      isContender = true;
      confidence = Math.min(1, confidence + 0.25);
    }
  }

  // Other G1 races with $1M+ purses
  if (horseRating > 70) {
    const majorG1Races = GRADED_RACES.filter(
      (r) =>
        r.grade === "G1" && r.purse >= 1000000 && !r.triplecrownKey && r.bcKey !== "breeders-cup",
    );
    for (const race of majorG1Races) {
      if (
        horse.distanceAptitude > race.distance - 300 &&
        horse.distanceAptitude < race.distance + 300
      ) {
        targetRaces.push(race.key);
        confidence += 0.1;
      }
    }
    if (targetRaces.length >= 1 && horseRating > 80) {
      isContender = true;
      confidence = Math.min(1, confidence + 0.15);
    }
  }

  const status: ContenderStatus = {
    horseId: horse.id,
    isContender,
    targetRaces: [...new Set(targetRaces)],
    confidence,
    lastAssessmentDay: currentDay,
    contenderSeries,
  };

  return {
    ...aiState,
    contenderTracking: {
      ...aiState.contenderTracking,
      [horse.id]: status,
    },
  };
}
