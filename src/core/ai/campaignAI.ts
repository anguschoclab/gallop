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
} from "@/core/data/gradedRacesAccessor";
import { calculateOverallRating, calculateRaceRating } from "@/core/horse/stats";
import { getTripleCrownKeysForArchetype } from "@/core/breeding/archetypes";

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
 * A contender-series detector. Each detector checks whether a horse qualifies
 * for a specific series (Triple Crown, Breeders Cup, Dubai World Cup, Other G1)
 * and returns the matching target race keys plus a confidence contribution.
 */
type ContenderDetector = (input: {
  horse: Horse;
  horseRating: number;
  avgStat: number;
  targetSeriesKeys: string[];
}) => {
  targetRaces: string[];
  confidence: number;
  contenderSeriesUpdates?: Record<string, { targetRaces: string[]; confidence: number }>;
};

/**
 * Check if a horse's distance aptitude falls within ±300m of a race's distance.
 * @param horse - The horse to check.
 * @param raceDistance - The race distance in meters.
 * @returns True if the horse's aptitude is within ±300m of the race distance.
 */
function distanceAptitudeMatches(horse: Horse, raceDistance: number): boolean {
  return horse.distanceAptitude > raceDistance - 300 && horse.distanceAptitude < raceDistance + 300;
}

// Triple Crown contender criteria — only 3yos with avg stat > 70
const detectTripleCrown: ContenderDetector = ({ horse, avgStat, targetSeriesKeys }) => {
  if (horse.age !== 3 || avgStat <= 70) return { targetRaces: [], confidence: 0 };
  const tcRaces = Array.from(GRADED_RACES_BY_TRIPLECROWN_KEY.values()).flat();
  const targetRaces: string[] = [];
  let confidence = 0;
  const contenderSeriesUpdates: Record<string, { targetRaces: string[]; confidence: number }> = {};
  for (const race of tcRaces) {
    if (targetSeriesKeys.length > 0 && !targetSeriesKeys.includes(race.triplecrownKey || "")) {
      continue;
    }
    if (distanceAptitudeMatches(horse, race.distance)) {
      targetRaces.push(race.key);
      confidence += 0.2;
      const tcKey = race.triplecrownKey || "";
      if (!contenderSeriesUpdates[tcKey]) {
        contenderSeriesUpdates[tcKey] = { targetRaces: [], confidence: 0 };
      }
      contenderSeriesUpdates[tcKey].targetRaces.push(race.key);
      contenderSeriesUpdates[tcKey].confidence += 0.2;
    }
  }
  return { targetRaces, confidence, contenderSeriesUpdates };
};

// Breeders Cup contender criteria — 3yo+ with rating > 65
const detectBreedersCup: ContenderDetector = ({ horse, horseRating }) => {
  if (horse.age < 3 || horseRating <= 65) return { targetRaces: [], confidence: 0 };
  const bcRaces = GRADED_RACES_BY_BC_KEY.get("breeders-cup") ?? [];
  const targetRaces: string[] = [];
  let confidence = 0;
  for (const race of bcRaces) {
    if (distanceAptitudeMatches(horse, race.distance)) {
      targetRaces.push(race.key);
      confidence += 0.15;
    }
  }
  return { targetRaces, confidence };
};

// Dubai World Cup contender criteria — 4yo+ with rating > 75
const detectDubaiWorldCup: ContenderDetector = ({ horse, horseRating }) => {
  if (horse.age < 4 || horseRating <= 75) return { targetRaces: [], confidence: 0 };
  const dwcRace = GRADED_RACES_BY_KEY.get("dubai-world-cup");
  if (!dwcRace || !distanceAptitudeMatches(horse, dwcRace.distance)) {
    return { targetRaces: [], confidence: 0 };
  }
  return { targetRaces: [dwcRace.key], confidence: 0.25 };
};

// Other G1 races with $1M+ purses — rating > 70
const detectOtherMajorG1: ContenderDetector = ({ horse, horseRating }) => {
  if (horseRating <= 70) return { targetRaces: [], confidence: 0 };
  const majorG1Races = GRADED_RACES.filter(
    (r) =>
      r.grade === "G1" && r.purse >= 1000000 && !r.triplecrownKey && r.bcKey !== "breeders-cup",
  );
  const targetRaces: string[] = [];
  let confidence = 0;
  for (const race of majorG1Races) {
    if (distanceAptitudeMatches(horse, race.distance)) {
      targetRaces.push(race.key);
      confidence += 0.1;
    }
  }
  return { targetRaces, confidence };
};

// Registry of contender detectors in priority order
const CONTENDER_DETECTORS: readonly ContenderDetector[] = [
  detectTripleCrown,
  detectBreedersCup,
  detectDubaiWorldCup,
  detectOtherMajorG1,
];

/** Input for a final contender classification rule. */
interface ClassificationInput {
  horse: Horse;
  horseRating: number;
  avgStat: number;
  targetRaces: string[];
}

/** A final contender classification rule. */
interface ContenderClassificationRule {
  (input: ClassificationInput): { matches: boolean; confidenceBoost: number };
}

// Final classification rules — replace the if/else-if chain with a registry.
const CONTENDER_CLASSIFICATION_RULES: readonly ContenderClassificationRule[] = [
  // Triple Crown: contender if 2+ target races
  ({ horse, avgStat, targetRaces }) =>
    horse.age === 3 && avgStat > 70 && targetRaces.length >= 2
      ? { matches: true, confidenceBoost: 0.3 }
      : { matches: false, confidenceBoost: 0 },
  // Breeders Cup: contender if 1+ target race and rating > 75
  ({ horse, horseRating, targetRaces }) =>
    horse.age >= 3 && horseRating > 65 && targetRaces.length >= 1 && horseRating > 75
      ? { matches: true, confidenceBoost: 0.2 }
      : { matches: false, confidenceBoost: 0 },
  // Dubai World Cup: contender if matched
  ({ horse, horseRating }) => {
    if (horse.age < 4 || horseRating <= 75) return { matches: false, confidenceBoost: 0 };
    const dwcRace = GRADED_RACES_BY_KEY.get("dubai-world-cup");
    if (
      dwcRace &&
      horse.distanceAptitude > dwcRace.distance - 300 &&
      horse.distanceAptitude < dwcRace.distance + 300
    )
      return { matches: true, confidenceBoost: 0.25 };
    return { matches: false, confidenceBoost: 0 };
  },
  // Other G1: contender if 1+ target race and rating > 80
  ({ horseRating, targetRaces }) =>
    horseRating > 70 && targetRaces.length >= 1 && horseRating > 80
      ? { matches: true, confidenceBoost: 0.15 }
      : { matches: false, confidenceBoost: 0 },
];

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

  const detectorInput = { horse, horseRating, avgStat, targetSeriesKeys };

  for (const detector of CONTENDER_DETECTORS) {
    const result = detector(detectorInput);
    targetRaces.push(...result.targetRaces);
    confidence += result.confidence;

    // Triple Crown detector returns per-series updates to fold into contenderSeries
    if (result.contenderSeriesUpdates) {
      for (const [tcKey, update] of Object.entries(result.contenderSeriesUpdates)) {
        if (!contenderSeries[tcKey]) {
          contenderSeries[tcKey] = {
            isContender: false,
            confidence: 0,
            targetRaces: [],
            lastAssessmentDay: currentDay,
          };
        }
        contenderSeries[tcKey].targetRaces.push(...update.targetRaces);
        contenderSeries[tcKey].confidence += update.confidence;
      }
    }
  }

  // Mark series as contender if they have enough target races
  for (const tcKey in contenderSeries) {
    if (contenderSeries[tcKey].targetRaces.length >= 2) {
      contenderSeries[tcKey].isContender = true;
      contenderSeries[tcKey].confidence = Math.min(1, contenderSeries[tcKey].confidence + 0.3);
    }
  }

  // Apply final contender classification rules from the registry.
  for (const rule of CONTENDER_CLASSIFICATION_RULES) {
    const result = rule({ horse, horseRating, avgStat, targetRaces });
    if (result.matches) {
      isContender = true;
      confidence = Math.min(1, confidence + result.confidenceBoost);
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
