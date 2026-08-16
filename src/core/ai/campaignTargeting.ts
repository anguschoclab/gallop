import type { Horse, Stable } from "@/game/types";
import type { GradedRace } from "@/data/gradedRaces";
import type { TripleCrownProgress } from "@/core/calendar/campaignTypes";
import { calculateUtilityScore } from "./personalitySystem";
import { getSuccessRate, getAdaptiveThreshold } from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import { getTripleCrownKeysForArchetype } from "@/core/breeding/archetypes";
import { GRADED_RACES_BY_KEY, GRADED_RACES_BY_TRIPLECROWN_KEY } from "@/data/gradedRaces";
import type { CampaignAIState, ContenderStatus } from "./campaignAI";

export function getOptimalMajorRaceTarget(
  aiState: CampaignAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
  triplecrownHistory: TripleCrownProgress[] = [],
): string | null {
  const contenderStatus = aiState.contenderTracking[horse.id];
  if (!contenderStatus || !contenderStatus.isContender) return null;

  const tcHistoryMap = new Map<string, TripleCrownProgress>();
  for (const p of triplecrownHistory) {
    tcHistoryMap.set(`${p.horseId}:${p.triplecrownKey}`, p);
  }

  let bestRaceKey: string | null = null;
  let bestScore = 0;

  for (const raceKey of contenderStatus.targetRaces) {
    const race = GRADED_RACES_BY_KEY.get(raceKey);
    if (!race) continue;

    const score = calculateRaceTargetScore(aiState, horse, race, stable, currentDay, tcHistoryMap);
    if (score > bestScore) {
      bestScore = score;
      bestRaceKey = raceKey;
    }
  }

  return bestRaceKey;
}

export function calculateRaceTargetScore(
  aiState: CampaignAIState,
  horse: Horse,
  race: GradedRace,
  stable: Stable,
  currentDay: number,
  tcHistoryMap: Map<string, TripleCrownProgress>,
): number {
  let score = 0;

  const distDiff = Math.abs(horse.distanceAptitude - race.distance);
  if (distDiff < 200) score += 30;
  else if (distDiff < 400) score += 20;
  else if (distDiff < 600) score += 10;

  if (race.surface && horse.surfaceAptitude[race.surface as "Turf" | "Dirt" | "Synthetic"]) {
    score += horse.surfaceAptitude[race.surface as "Turf" | "Dirt" | "Synthetic"] * 20;
  }

  if (race.triplecrownKey) {
    score += 40;

    if (stable.breedingArchetype) {
      const targetSeries = getTripleCrownKeysForArchetype(stable.breedingArchetype);
      if (targetSeries.includes(race.triplecrownKey || "")) {
        score += 20;
      }
    }

    const progress = tcHistoryMap.get(`${horse.id}:${race.triplecrownKey}`);
    if (progress && progress.legs.length > 0) {
      const wins = progress.legs.filter((l) => l.position === 1).length;
      if (wins > 0) {
        score += wins * 30;
      } else {
        score += 10;
      }
    }
  }

  if (race.bcKey === "breeders-cup") score += 35;
  if (race.key === "dubai-world-cup") score += 35;
  if (race.grade === "G1") score += 25;

  score += Math.min(20, race.purse / 100000);

  const factors: Record<string, number> = {
    race_prestige: race.triplecrownKey ? 1 : race.bcKey === "breeders-cup" ? 0.9 : 0.7,
    horse_quality: calculateOverallRating(horse),
    distance_fit: score,
  };

  score = calculateUtilityScore(aiState.personalityState, "campaign_targeting", factors);

  const contextKey = `${stable.personality}:${race.key}`;
  const successRate = getSuccessRate(aiState.learningState, "campaign_targeting", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  return score;
}

export function shouldTargetMajorRace(
  aiState: CampaignAIState,
  horse: Horse,
  race: GradedRace,
  stable: Stable,
  currentDay: number,
  triplecrownHistory: TripleCrownProgress[] = [],
): boolean {
  const contenderStatus = aiState.contenderTracking[horse.id];
  if (!contenderStatus || !contenderStatus.isContender) return false;

  if (!contenderStatus.targetRaces.includes(race.key)) return false;

  const recoveryPoints = horse.recoveryPoints ?? 100;
  if (recoveryPoints < 40) {
    return false;
  } else if (recoveryPoints < 60) {
    if (stable.personality !== "aggressive" && stable.personality !== "win-now") {
      return false;
    }
  }

  let bounceRisk = false;
  if (horse.lastBeyer && horse.lastRaceDay && currentDay) {
    const daysSinceLastRace = currentDay - horse.lastRaceDay;
    const beyerHistory = horse.raceHistory
      .filter((r) => r.beyer !== undefined)
      .map((r) => r.beyer!);
    const avgBeyer =
      beyerHistory.length > 0
        ? beyerHistory.reduce((sum, b) => sum + b, 0) / beyerHistory.length
        : 80;

    if (horse.lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28) {
      bounceRisk = true;
    }
  }

  if (bounceRisk && stable.personality !== "aggressive" && stable.personality !== "win-now") {
    return false;
  }

  const tcHistoryMap = new Map<string, TripleCrownProgress>();
  for (const p of triplecrownHistory) {
    tcHistoryMap.set(`${p.horseId}:${p.triplecrownKey}`, p);
  }

  const score = calculateRaceTargetScore(aiState, horse, race, stable, currentDay, tcHistoryMap);

  const contextKey = `${stable.personality}:${race.key}`;
  const baseThreshold = 50;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "campaign_targeting",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  const config = aiState.personalityState;
  let threshold = adaptiveThreshold;

  if (config.personality === "aggressive") threshold -= 10;
  if (config.personality === "conservative") threshold += 10;
  if (config.personality === "prestige" && (race.triplecrownKey || race.bcKey === "breeders-cup")) {
    threshold -= 15;
  }

  if (recoveryPoints < 60) threshold += 10;
  if (bounceRisk) threshold += 15;

  return score > threshold;
}

interface PrepRaceStrategy {
  prepRaceDaysBefore: number;
  prepRaceGrade: string;
  numberOfPreps: number;
}

const PREP_RACE_STRATEGIES: Record<Stable["personality"], PrepRaceStrategy> = {
  aggressive: { prepRaceDaysBefore: 21, prepRaceGrade: "G3", numberOfPreps: 3 },
  conservative: { prepRaceDaysBefore: 45, prepRaceGrade: "G2", numberOfPreps: 1 },
  "win-now": { prepRaceDaysBefore: 28, prepRaceGrade: "G2", numberOfPreps: 2 },
  developer: { prepRaceDaysBefore: 30, prepRaceGrade: "G3", numberOfPreps: 2 },
  prestige: { prepRaceDaysBefore: 30, prepRaceGrade: "G3", numberOfPreps: 2 },
  trader: { prepRaceDaysBefore: 30, prepRaceGrade: "G3", numberOfPreps: 2 },
  specialist: { prepRaceDaysBefore: 30, prepRaceGrade: "G3", numberOfPreps: 2 },
  breeder: { prepRaceDaysBefore: 30, prepRaceGrade: "G3", numberOfPreps: 2 },
};

export function getPrepRaceStrategy(
  aiState: CampaignAIState,
  horse: Horse,
  targetRace: GradedRace,
  stable: Stable,
  currentDay: number,
): {
  prepRaceDaysBefore: number;
  prepRaceGrade: string;
  numberOfPreps: number;
} {
  const config = aiState.personalityState;

  let prepRaceDaysBefore = 30;
  let prepRaceGrade = "G3";
  let numberOfPreps = 2;

  const prepStrategy = PREP_RACE_STRATEGIES[config.personality];
  if (prepStrategy) {
    prepRaceDaysBefore = prepStrategy.prepRaceDaysBefore;
    prepRaceGrade = prepStrategy.prepRaceGrade;
    numberOfPreps = prepStrategy.numberOfPreps;
  }

  if (targetRace.triplecrownKey) {
    const seriesRaces = GRADED_RACES_BY_TRIPLECROWN_KEY.get(targetRace.triplecrownKey) ?? [];
    if (seriesRaces.length >= 2) {
      const sortedRaces = seriesRaces.sort((a, b) => a.dayOfYear - b.dayOfYear);
      const targetIndex = sortedRaces.findIndex((r) => r.key === targetRace.key);

      if (targetIndex > 0) {
        const gap = sortedRaces[targetIndex].dayOfYear - sortedRaces[targetIndex - 1].dayOfYear;
        prepRaceDaysBefore = Math.max(14, Math.floor(gap * 0.4));
      } else {
        prepRaceDaysBefore = 21;
      }
    } else {
      prepRaceDaysBefore = 21;
    }
    numberOfPreps = 2;
  }

  if (targetRace.bcKey === "breeders-cup") {
    prepRaceDaysBefore = 35;
  }

  return { prepRaceDaysBefore, prepRaceGrade, numberOfPreps };
}

export function selectPrepRace(
  contender: ContenderStatus,
  targetRaceKey: string,
  upcomingRaces: GradedRace[],
  currentDayOfYear: number,
): string | null {
  const targetRace = GRADED_RACES_BY_KEY.get(targetRaceKey);
  if (!targetRace || upcomingRaces.length === 0) return null;

  let bestRace: GradedRace | null = null;
  let bestScore = -1;

  for (const race of upcomingRaces) {
    if (race.key === targetRaceKey) continue;

    const dayDiff = race.dayOfYear - currentDayOfYear;
    if (dayDiff < 7 || dayDiff > 42) continue;

    let score = 50;

    const distanceDiff = Math.abs(race.distance - targetRace.distance);
    if (distanceDiff <= 100) {
      score += 20;
    } else if (distanceDiff <= 200) {
      score += 10;
    }

    if (race.surface === targetRace.surface) {
      score += 15;
    }

    const weeksToTarget = (targetRace.dayOfYear - race.dayOfYear) / 7;
    if (weeksToTarget >= 2 && weeksToTarget <= 4) {
      score += 15;
    } else if (weeksToTarget >= 1 && weeksToTarget <= 6) {
      score += 5;
    }

    if (race.grade === "G3") {
      score += 10;
    } else if (race.grade === "G2") {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRace = race;
    }
  }

  return bestRace?.key ?? null;
}
