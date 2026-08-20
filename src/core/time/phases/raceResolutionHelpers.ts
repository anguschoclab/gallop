import { PRIZE_SPLIT, GRADED_PRIZE_SPLIT, TOP_FINISH_POSITION } from "@/constants";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type {
  TrackRecordImpact,
  SeasonHistoryImpact,
  HallOfFameInductionImpact,
} from "@/core/resolver/impacts/index";
import type { Race, RaceRunner, Horse, Stable, Jockey } from "@/game/types";
import type { TrackRecord } from "@/core/history/historyTypes";
import type { Rng } from "@/core/common/rng";
import type { ClaimingIntent } from "@/core/resolver/intents";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { recordRaceEntryOutcome } from "@/core/ai/raceEntryAI";
import { recordJockeyOutcome } from "@/core/ai/jockeyAI";
import { recordCampaignOutcome } from "@/core/ai/campaignAI";
import { recordRaceStrategy } from "@/core/ai/jockeyStrategyAI";
import {
  recordRaceHistory,
  checkHallOfFameInduction,
  checkTrackRecord,
} from "@/services/history/historyService";
import { processClaimingResolution } from "@/services/auction/claimingResolutionService";
import { generateUUID } from "@/core/uuid";

interface RaceResult {
  horseId: string;
  position: number;
  time: number;
}

/**
 * Record NPC AI learning outcomes for all runners in a race.
 *
 * @param npcAIManager - The NPC AI manager to update.
 * @param race - The race being resolved.
 * @param result - Race finishing results.
 * @param runners - Race simulation runners.
 * @param horseMap - Map of horse IDs to horses.
 * @param jockeyMap - Map of jockey IDs to jockeys.
 * @param stableMap - Map of stable IDs to stables.
 * @param newDay - Current simulation day.
 */
export function recordNpcAiOutcomes(
  npcAIManager: NpcAIManager,
  race: Race,
  result: RaceResult[],
  runners: RaceRunner[],
  horseMap: Map<string, Horse>,
  jockeyMap: Map<string, Jockey>,
  stableMap: Map<string, Stable>,
  newDay: number,
): void {
  const runnerByHorseId = new Map(runners.map((r) => [r.horseId, r]));
  for (const res of result) {
    const horse = horseMap.get(res.horseId);
    if (horse && horse.stableId) {
      const stable = stableMap.get(horse.stableId);
      if (stable) {
        const stableAI = getOrCreateStableAIState(npcAIManager, stable, newDay);

        if (stableAI.raceEntryAI) {
          stableAI.raceEntryAI = recordRaceEntryOutcome(
            stableAI.raceEntryAI,
            horse,
            race,
            newDay,
            res.position <= TOP_FINISH_POSITION,
            res.position,
          );
        }

        if (stableAI.jockeyAI) {
          const runner = runnerByHorseId.get(res.horseId);
          if (runner && runner.jockeyId) {
            const prizeSplit = race.graded ? GRADED_PRIZE_SPLIT : PRIZE_SPLIT;
            const prize =
              res.position <= prizeSplit.length
                ? Math.round(race.purse * prizeSplit[res.position - 1])
                : 0;
            stableAI.jockeyAI = recordJockeyOutcome(
              stableAI.jockeyAI,
              runner.jockeyId,
              res.horseId,
              race.id,
              res.position,
              prize,
              newDay,
            );
          }
        }

        if (stableAI.campaignAI && race.graded?.key) {
          const prizeSplit = race.graded ? GRADED_PRIZE_SPLIT : PRIZE_SPLIT;
          const prize =
            res.position <= prizeSplit.length
              ? Math.round(race.purse * prizeSplit[res.position - 1])
              : 0;
          stableAI.campaignAI = recordCampaignOutcome(
            stableAI.campaignAI,
            res.horseId,
            race.graded.key,
            res.position,
            prize,
            newDay,
          );
        }

        if (stableAI.jockeyStrategyAI) {
          const runner = runnerByHorseId.get(res.horseId);
          const jockey = runner?.jockeyId ? jockeyMap.get(runner.jockeyId) : undefined;
          if (jockey) {
            const style = horse.runningStyle ?? "P";
            const entry = race.entries.find((e) => e.horseId === horse.id);
            const aggressiveness = entry?.jockeyInstructions?.aggressiveness ?? 50;
            stableAI.jockeyStrategyAI = recordRaceStrategy(
              stableAI.jockeyStrategyAI,
              horse,
              race,
              jockey,
              stable,
              style,
              aggressiveness,
              res.position,
              newDay,
            );
          }
        }

        npcAIManager.stableStates[stable.id] = stableAI;
      }
    }
  }
}

/**
 * Check for track record, G1 season history, and Hall of Fame induction.
 *
 * @param race - The completed race.
 * @param result - Race finishing results.
 * @param runners - Race simulation runners.
 * @param horseMap - Map of horse IDs to horses.
 * @param newDay - Current simulation day.
 * @param trackRecords - Existing track records.
 * @param hallOfFameIds - Set of horse IDs already in Hall of Fame.
 * @returns Array of impacts generated.
 */
export function checkTrackRecordAndHof(
  race: Race,
  result: RaceResult[],
  runners: RaceRunner[],
  horseMap: Map<string, Horse>,
  newDay: number,
  trackRecords: Record<string, TrackRecord>,
  hallOfFameIds: Set<string>,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  const winnerResult = result.find((r) => r.position === 1);
  const winnerHorse = winnerResult ? horseMap.get(winnerResult.horseId) : null;

  if (winnerResult && winnerHorse) {
    const trackRecord = checkTrackRecord(
      race,
      winnerResult.horseId,
      winnerHorse.name,
      winnerResult.time,
      newDay,
      trackRecords,
    );
    if (trackRecord) {
      impacts.push({
        id: generateUUID(),
        intentId: race.id,
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "track_record",
        record: trackRecord,
        reason: "New track record set!",
      } as TrackRecordImpact);
    }
  }

  if (race.graded?.grade === "G1") {
    const historyRecord = recordRaceHistory(race, result, runners, horseMap, newDay);
    if (historyRecord) {
      impacts.push({
        id: generateUUID(),
        intentId: race.id,
        day: newDay,
        phase: "raceResolution",
        logLevel: "never",
        type: "season_history_record",
        record: historyRecord,
      } as SeasonHistoryImpact);
    }

    const winnerId = result.find((r) => r.position === 1)?.horseId;
    const winner = winnerId ? horseMap.get(winnerId) : null;
    if (winner && winner.id) {
      const prizeMoney = race.purse * PRIZE_SPLIT[0];
      const tempHorse = {
        ...winner,
        lifetimeEarnings: (winner.lifetimeEarnings ?? 0) + prizeMoney,
        careerWins: (winner.careerWins ?? 0) + 1,
        raceHistory: [
          ...winner.raceHistory,
          { raceId: race.id, raceName: race.name, grade: "G1", position: 1, day: newDay },
        ],
      };
      const hofEntry = checkHallOfFameInduction(tempHorse, newDay);
      if (hofEntry && !hallOfFameIds.has(winner.id)) {
        impacts.push({
          id: generateUUID(),
          intentId: race.id,
          day: newDay,
          phase: "raceResolution",
          logLevel: "always",
          type: "hall_of_fame_induction",
          entry: hofEntry,
          reason: "G1 winner reached HoF criteria",
        } as HallOfFameInductionImpact);
      }
    }
  }

  return impacts;
}

/**
 * Process claiming resolution for a race.
 *
 * @param race - The claiming race.
 * @param intents - All pipeline intents (filtered for matching claims).
 * @param horses - All horses in game state.
 * @param newDay - Current simulation day.
 * @param rng - Seeded RNG.
 * @returns Array of claiming impacts.
 */
export function processClaimingForRace(
  race: Race,
  intents: ClaimingIntent[],
  horses: Horse[],
  newDay: number,
  rng: Rng,
): AnyImpact[] {
  if (!race.claimingPrice || intents.length === 0) return [];

  const { impacts: claimingImpacts } = processClaimingResolution({
    race,
    claimIntents: intents,
    horses,
    newDay,
    rng,
  });
  return claimingImpacts;
}
