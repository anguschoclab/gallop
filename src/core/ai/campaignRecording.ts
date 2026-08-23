import type { Horse, Stable } from "@/game/types";
import type { GradedRace } from "@/data/gradedRaces";
import { recordPersonalityOutcome } from "./personalitySystem";
import { GRADED_RACES_BY_KEY } from "@/data/gradedRaces";
import type { CampaignAIState, CampaignDecision, ContenderStatus } from "./campaignAI";
import { trimHistory } from "./learningModule";

export function recordCampaignDecision(
  aiState: CampaignAIState,
  horse: Horse,
  raceKey: string,
  targetRaceKey: string,
  stable: Stable,
  currentDay: number,
): CampaignAIState {
  const decision: CampaignDecision = {
    horseId: horse.id,
    raceKey,
    targetRaceKey,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  const newHistory = [...aiState.campaignHistory, decision];

  const trimmedHistory = trimHistory(newHistory, aiState.personalityState.memoryDepth);

  return {
    ...aiState,
    campaignHistory: trimmedHistory,
  };
}

export function recordCampaignOutcome(
  aiState: CampaignAIState,
  horseId: string,
  targetRaceKey: string,
  position: number,
  prize: number,
  currentDay: number,
): CampaignAIState {
  const decisionIndex = aiState.campaignHistory.findIndex(
    (d) => d.horseId === horseId && d.targetRaceKey === targetRaceKey && d.success === undefined,
  );

  if (decisionIndex !== -1) {
    const decision = { ...aiState.campaignHistory[decisionIndex] };
    decision.success = position <= 3;
    decision.position = position;
    decision.prize = prize;

    const newHistory = [...aiState.campaignHistory];
    newHistory[decisionIndex] = decision;

    const contextKey = `${decision.personality}:${targetRaceKey}`;
    const value = prize > 0 ? prize / 10000 : -position;
    const newPersonalityState = recordPersonalityOutcome(
      aiState.personalityState,
      "campaign",
      { horseId, raceKey: decision.raceKey, targetRaceKey },
      decision.success,
      value,
      currentDay,
    );

    return {
      ...aiState,
      campaignHistory: newHistory,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}

export function getCampaignInsights(
  aiState: CampaignAIState,
  stableId: string,
): {
  totalCampaigns: number;
  successRate: number;
  avgPosition: number;
  totalPrize: number;
  contenderCount: number;
} {
  const stableHistory = aiState.campaignHistory.filter(
    (d) => d.stableId === stableId && d.success !== undefined,
  );
  const totalCampaigns = stableHistory.length;
  const successes = stableHistory.filter((d) => d.success).length;
  const successRate = totalCampaigns > 0 ? successes / totalCampaigns : 0.5;
  const avgPosition =
    totalCampaigns > 0
      ? stableHistory.reduce((sum, d) => sum + (d.position || 5), 0) / totalCampaigns
      : 5;
  const totalPrize =
    totalCampaigns > 0 ? stableHistory.reduce((sum, d) => sum + (d.prize || 0), 0) : 0;

  const contenderCount = Object.values(aiState.contenderTracking).filter(
    (c) => c.isContender && c.lastAssessmentDay > 0,
  ).length;

  return {
    totalCampaigns,
    successRate,
    avgPosition,
    totalPrize,
    contenderCount,
  };
}

export function decayContenderConfidence(
  contender: ContenderStatus,
  recentResults: number[],
  currentDay: number,
): ContenderStatus {
  if (!contender.isContender) return contender;
  if (recentResults.length === 0) return contender;

  const avgPosition = recentResults.reduce((sum, p) => sum + p, 0) / recentResults.length;

  let confidenceDelta = 0;
  if (avgPosition <= 2) {
    confidenceDelta = 0.05;
  } else if (avgPosition <= 3) {
    confidenceDelta = 0.02;
  } else if (avgPosition > 5) {
    confidenceDelta = -0.1;
  } else if (avgPosition > 4) {
    confidenceDelta = -0.05;
  }

  const newConfidence = Math.max(0, Math.min(1, contender.confidence + confidenceDelta));
  const stillContender = newConfidence >= 0.3;

  return {
    ...contender,
    confidence: newConfidence,
    isContender: stillContender,
    lastAssessmentDay: currentDay,
  };
}

export function coordinateMultiHorsePrep(
  contenders: Array<{ horseId: string; status: ContenderStatus }>,
  targetRaceKey: string,
  upcomingRaces: GradedRace[],
  currentDay: number,
): Map<string, string | null> {
  const assignments = new Map<string, string | null>();
  const usedRaceKeys = new Set<string>();

  const sorted = [...contenders].sort((a, b) => b.status.confidence - a.status.confidence);

  for (const { horseId, status } of sorted) {
    const available = upcomingRaces.filter((r) => !usedRaceKeys.has(r.key));
    const prepRace = selectPrepRaceForCoordination(status, targetRaceKey, available, currentDay);
    if (prepRace) {
      usedRaceKeys.add(prepRace);
    }
    assignments.set(horseId, prepRace);
  }

  return assignments;
}

function selectPrepRaceForCoordination(
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
