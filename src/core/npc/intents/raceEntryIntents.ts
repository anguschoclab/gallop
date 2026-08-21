import type { RaceEntryIntent } from "@/core/resolver/intents";
import type { GameState, Horse, Race, Stable } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { createRaceEntryAIState, calculateStrategicEntryScore } from "@/core/ai/raceEntryAI";
import {
  calculateOptimalTactics,
  createJockeyStrategyAIState,
  applyAffinityBoost,
} from "@/core/ai/jockeyStrategyAI";
import type { StableAIState, DifficultyState } from "@/core/ai/npcCycleAI";
import type { DistressLevel } from "@/core/ai/financialDistressAI";
import { MEDIUM_PURSE_THRESHOLD } from "@/constants";

export function generateNpcRaceEntryIntents(
  state: GameState,
  stable: Stable,
  stableAI: StableAIState | undefined,
  day: number,
  ownedHorses: Horse[],
  upcomingRaces: Race[],
  raceEntrySets: Map<string, Set<string>>,
  horseMap: Map<string, Horse>,
  raceEntryWeight = 1.0,
  distressLevel: DistressLevel = "healthy",
  difficultyModulator?: DifficultyState,
): RaceEntryIntent[] {
  const intents: RaceEntryIntent[] = [];

  const raceEntryAI = stableAI?.raceEntryAI ?? createRaceEntryAIState(stable);
  const jockeyStrategyAI = stableAI?.jockeyStrategyAI ?? createJockeyStrategyAIState(stable);
  const jockeyMap = new Map((state.jockeys || []).map((j) => [j.id, j]));

  for (const race of upcomingRaces) {
    if (distressLevel === "critical" && race.purse < MEDIUM_PURSE_THRESHOLD) continue;

    const entrySet = raceEntrySets.get(race.id);
    for (const horse of ownedHorses) {
      if (entrySet && entrySet.has(horse.id)) continue;

      if (race.graded?.requiresInvitation) {
        const invitedIds = race.invitedHorseIds ?? race.graded.invitedHorseIds ?? [];
        const isInvited = invitedIds.includes(horse.id);
        const currentYear = Math.floor((day - 1) / 365) + 1;
        const isWinAndYouIn =
          race.graded.key &&
          horse.winAndYouInQualified?.some(
            (q) => q.raceKey === race.graded!.key && q.year === currentYear,
          );
        if (!isInvited && !isWinAndYouIn) continue;
      }

      const suitability = calculateStrategicEntryScore(
        raceEntryAI,
        horse,
        race,
        stable,
        day,
        horseMap,
      );

      let threshold = 60;
      if (stableAI?.npcRelationships) {
        for (const entry of race.entries) {
          const otherHorse = horseMap.get(entry.horseId);
          if (
            !otherHorse ||
            otherHorse.ownership?.type !== "npc" ||
            otherHorse.ownership.stableId === stable.id
          )
            continue;
          const rel = stableAI.npcRelationships[otherHorse.ownership.stableId];
          if (rel?.allianceType === "racing_coalition") {
            threshold = 70;
            break;
          }
        }
      }

      threshold /= raceEntryWeight;

      if (difficultyModulator) {
        threshold *= difficultyModulator.npcCompetenceMultiplier;
      }

      if (suitability > threshold) {
        const allJockeys = state.jockeys || [];
        const jockey = allJockeys.find((j) => j.stableId === stable.id) || allJockeys[0];
        if (!jockey) continue;
        const jockeyInstructions = applyAffinityBoost(
          calculateOptimalTactics(jockeyStrategyAI, horse, race, jockey, stable),
          jockey,
          horse.id,
        );

        intents.push({
          id: generateUUID(),
          entityId: race.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 50,
          type: "race_entry",
          raceId: race.id,
          horseId: horse.id,
          jockeyInstructions,
        });
      }
    }
  }

  return intents;
}
