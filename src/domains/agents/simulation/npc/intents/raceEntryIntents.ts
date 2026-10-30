import type { RaceEntryIntent } from "@/platform/resolver/intents";
import type { GameState, Horse, Race, Stable } from "@/platform/game/types";
import { generateUUID } from "@/shared/uuid/uuid";
import { createRaceEntryAIState } from "@/domains/agents/simulation/raceEntryAITypes";
import {
  calculateStrategicEntryScore,
  type RaceCompetitorIndex,
} from "@/domains/agents/simulation/raceEntryAIScoring";
import {
  calculateOptimalTactics,
  createJockeyStrategyAIState,
} from "@/domains/agents/simulation/jockeyStrategyAI";
import { applyAffinityBoost } from "@/domains/agents/simulation/jockeyStrategyAdjustments";
import type { StableAIState, DifficultyState } from "@/domains/agents/simulation/npcCycleAI";
import type { DistressLevel } from "@/domains/agents/simulation/financialDistressAI";
import { MEDIUM_PURSE_THRESHOLD } from "@/domains/prestige/model/fameConstants";
import {
  addNpcBooking,
  canBookNpcStart,
  NPC_ENTRY_CASH_RESERVE,
  prioritiseRacesForNpcEntry,
} from "@/domains/agents/simulation/npc/raceBooking";
import { MINIMUM_RACE_ENTRIES } from "@/domains/race/model/raceClassificationConstants";

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
  competitorIndex?: Map<string, RaceCompetitorIndex>,
): RaceEntryIntent[] {
  const intents: RaceEntryIntent[] = [];

  const raceEntryAI = stableAI?.raceEntryAI ?? createRaceEntryAIState(stable);
  const jockeyStrategyAI = stableAI?.jockeyStrategyAI ?? createJockeyStrategyAIState(stable);

  // Days each of this stable's horses is already entered to run, so a horse
  // gets one start per rest window instead of every suitable race.
  const owned = new Set(ownedHorses.map((h) => h.id));
  const bookings = new Map<string, number[]>();
  for (const race of upcomingRaces) {
    for (const horseId of raceEntrySets.get(race.id) ?? []) {
      if (owned.has(horseId)) addNpcBooking(bookings, horseId, race.day);
    }
  }
  // Entry fees committed by this batch; stop before the stable can't pay.
  let committedFees = 0;

  // With one start per rest window, the order races are considered decides
  // which ones get runners — fill the player's races and thin fields first.
  for (const race of prioritiseRacesForNpcEntry(upcomingRaces, MINIMUM_RACE_ENTRIES + 2)) {
    if (distressLevel === "critical" && race.purse < MEDIUM_PURSE_THRESHOLD) continue;

    const entrySet = raceEntrySets.get(race.id);
    for (const horse of ownedHorses) {
      if (entrySet && entrySet.has(horse.id)) continue;
      if (!canBookNpcStart(bookings, horse, race.day)) continue;
      if (stable.cash - committedFees - NPC_ENTRY_CASH_RESERVE < race.entryFee) continue;

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
        competitorIndex?.get(race.id),
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
        addNpcBooking(bookings, horse.id, race.day);
        committedFees += race.entryFee;
      }
    }
  }

  return intents;
}
