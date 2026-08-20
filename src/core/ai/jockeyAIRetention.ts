import type { Horse, Stable } from "@/game/types";
import type { Jockey } from "@/game/types";
import type { JockeyAIState, JockeyAssignment, JockeyRetention } from "./jockeyAI";
import { getSuccessRate, recordLearningOutcome } from "./learningModule";

export function shouldRetainJockey(
  aiState: JockeyAIState,
  jockey: Jockey,
  stable: Stable,
  currentDay: number,
): boolean {
  const retention = aiState.retention.find(
    (r) => r.jockeyId === jockey.id && r.stableId === stable.id,
  );
  if (!retention) return true;

  const daysSinceHire = currentDay - retention.hireDay;
  const daysSinceUse = currentDay - retention.lastUseDay;
  const avgPrizePerRide =
    retention.totalRides > 0 ? retention.totalPrize / retention.totalRides : 0;

  const contextKey = `${jockey.id}`;
  const successRate = getSuccessRate(aiState.learningState, "jockey_retention", contextKey);

  const config = aiState.personalityState;
  let shouldRetain = true;

  if (config.personality === "conservative") {
    shouldRetain = avgPrizePerRide > 5000 && successRate > 0.4;
  } else if (config.personality === "aggressive") {
    const avgSkill =
      (jockey.stats.pacing +
        jockey.stats.positioning +
        jockey.stats.vigor +
        jockey.stats.gateSkill +
        jockey.stats.temperament) /
      5;
    shouldRetain = avgSkill > 80 || avgPrizePerRide > 8000;
  } else if (config.personality === "win-now") {
    shouldRetain = daysSinceUse < 30 && avgPrizePerRide > 10000;
  } else {
    shouldRetain = avgPrizePerRide > 3000 && successRate > 0.3;
  }

  if (daysSinceUse > 90 && avgPrizePerRide < 10000) {
    shouldRetain = false;
  }

  const totalAffinity = Object.values(jockey.affinityMap ?? {}).reduce((sum, xp) => sum + xp, 0);
  if (totalAffinity >= 200 && !shouldRetain) {
    shouldRetain = avgPrizePerRide > 1000;
  }
  if (totalAffinity >= 500 && daysSinceUse > 90) {
    shouldRetain = true;
  }

  return shouldRetain;
}

export function recordJockeyAssignment(
  aiState: JockeyAIState,
  jockey: Jockey,
  horse: Horse,
  raceId: string,
  stable: Stable,
  fee: number,
  currentDay: number,
): JockeyAIState {
  const assignment: JockeyAssignment = {
    jockeyId: jockey.id,
    horseId: horse.id,
    raceId,
    stableId: stable.id,
    day: currentDay,
    fee,
  };

  const newHistory = [...aiState.jockeyHistory, assignment];

  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  let retention = aiState.retention.find(
    (r) => r.jockeyId === jockey.id && r.stableId === stable.id,
  );
  if (!retention) {
    retention = {
      jockeyId: jockey.id,
      stableId: stable.id,
      hireDay: currentDay,
      lastUseDay: currentDay,
      totalRides: 0,
      totalPrize: 0,
      retained: true,
    };
  }

  const updatedRetention = {
    ...retention,
    lastUseDay: currentDay,
    totalRides: retention.totalRides + 1,
  };

  const newRetention = aiState.retention.some(
    (r) => r.jockeyId === jockey.id && r.stableId === stable.id,
  )
    ? aiState.retention.map((r) =>
        r.jockeyId === jockey.id && r.stableId === stable.id ? updatedRetention : r,
      )
    : [...aiState.retention, updatedRetention];

  return {
    ...aiState,
    jockeyHistory: trimmedHistory,
    retention: newRetention,
  };
}

export function recordJockeyOutcome(
  aiState: JockeyAIState,
  jockeyId: string,
  horseId: string,
  raceId: string,
  position: number,
  prize: number,
  currentDay: number,
): JockeyAIState {
  const assignmentIndex = aiState.jockeyHistory.findIndex(
    (a) => a.jockeyId === jockeyId && a.horseId === horseId && a.raceId === raceId && !a.result,
  );

  if (assignmentIndex !== -1) {
    const assignment = { ...aiState.jockeyHistory[assignmentIndex], result: { position, prize } };
    const newHistory = [...aiState.jockeyHistory];
    newHistory[assignmentIndex] = assignment;

    const retentionIndex = aiState.retention.findIndex(
      (r) => r.jockeyId === jockeyId && r.stableId === assignment.stableId,
    );
    let newRetention = aiState.retention;
    if (retentionIndex !== -1) {
      const retention = { ...aiState.retention[retentionIndex] };
      retention.totalPrize += prize;
      newRetention = [...aiState.retention];
      newRetention[retentionIndex] = retention;
    }

    const contextKey = `${jockeyId}`;
    const success = position <= 3;
    const value = prize - assignment.fee;
    const newLearningState = recordLearningOutcome(
      aiState.learningState,
      "jockey_contract",
      jockeyId,
      success,
      value,
      currentDay,
      aiState.personalityState.memoryDepth,
    );

    return {
      ...aiState,
      jockeyHistory: newHistory,
      retention: newRetention,
      learningState: newLearningState,
    };
  }

  return aiState;
}

export function getJockeyInsights(
  aiState: JockeyAIState,
  stableId: string,
): {
  totalAssignments: number;
  avgPosition: number;
  totalPrize: number;
  avgFee: number;
  retainedJockeys: number;
} {
  const stableAssignments = aiState.jockeyHistory.filter(
    (a) => a.stableId === stableId && a.result,
  );
  const totalAssignments = stableAssignments.length;
  const avgPosition =
    totalAssignments > 0
      ? stableAssignments.reduce((sum, a) => sum + (a.result!.position || 5), 0) / totalAssignments
      : 5;
  const totalPrize =
    totalAssignments > 0
      ? stableAssignments.reduce((sum, a) => sum + (a.result!.prize || 0), 0)
      : 0;
  const avgFee =
    totalAssignments > 0
      ? stableAssignments.reduce((sum, a) => sum + a.fee, 0) / totalAssignments
      : 0;

  const retainedJockeys = aiState.retention.filter(
    (r) => r.stableId === stableId && r.retained,
  ).length;

  return {
    totalAssignments,
    avgPosition,
    totalPrize,
    avgFee,
    retainedJockeys,
  };
}
