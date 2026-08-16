/**
 * phases/raceResolution.ts - Race resolution phase
 *
 * This file provides the race resolution phase that simulates unresolved races
 * and generates all race resolution impacts.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/race/raceResolution (resolveRaces), @/game/constants (PHASE_ORDER_RACE_RESOLUTION), @/core/resolver/impacts/index (AnyImpact), @/services/raceSimulationService (rngForRace), @/game/types (Race), @/core/resolver/intents (ClaimingIntent), @/services/raceSimulationExecutor (simulateRace), @/services/raceImpactGenerator (generateRaceImpacts), @/services/claimingResolutionService (processClaimingResolution), @/services/historyService (recordRaceHistory, checkHallOfFameInduction), @/game/uuid (generateUUID), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/core/ai/raceEntryAI (recordRaceEntryOutcome), @/core/ai/jockeyAI (recordJockeyOutcome), @/core/ai/campaignAI (recordCampaignOutcome)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import {
  PRIZE_SPLIT,
  GRADED_PRIZE_SPLIT,
  PHASE_ORDER_RACE_RESOLUTION,
  TOP_FINISH_POSITION,
  RACE_HISTORY_UNGRADED_RETENTION_DAYS,
} from "@/constants";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type {
  TrackRecordImpact,
  SeasonHistoryImpact,
  HallOfFameInductionImpact,
} from "@/core/resolver/impacts/index";
import { rngForRace } from "@/services/race/raceSimulationService";
import type { Race } from "@/game/types";
import type { WeatherState } from "@/core/weather/weatherTypes";
import type { ClaimingIntent, RaceResolutionIntent } from "@/core/resolver/intents";
import { simulateRace } from "@/services/race/raceSimulationExecutor";
import { generateRaceImpacts } from "@/services/race/raceImpactGenerator";
import { processClaimingResolution } from "@/services/auction/claimingResolutionService";
import {
  recordRaceHistory,
  checkHallOfFameInduction,
  checkTrackRecord,
} from "@/services/history/historyService";
import { generateUUID } from "@/core/uuid";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { recordRaceEntryOutcome } from "@/core/ai/raceEntryAI";
import { recordJockeyOutcome } from "@/core/ai/jockeyAI";
import { recordCampaignOutcome } from "@/core/ai/campaignAI";
import { recordRaceStrategy } from "@/core/ai/jockeyStrategyAI";

/**
 * Race Resolution Phase (Order 70)
 * Simulates unresolved races and generates all race resolution impacts.
 */
export const raceResolutionPhase: PipelinePhase = {
  name: "raceResolution",
  order: PHASE_ORDER_RACE_RESOLUTION,
  skipIf: (context) =>
    !!context.skipRaceResolution || Object.keys(context.state.horses).length === 0,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];
    const updatedRaces: Record<string, Race> = { ...state.races };
    const overdueRaces = Object.values(state.races).filter(
      (r) => !r.resolved && !r.cancelled && r.day <= newDay,
    );

    // PRE-INDEX: Use shared context maps built at pipeline entry
    const { horseMap, jockeyMap } = context;
    const npcStableMap = context.stableMap;
    const hallOfFameIds = new Set((state.hallOfFame ?? []).map((e) => e.horseId));

    // Clone the AI manager so NPC learning updates are applied as a new object.
    const npcAIManager = state.npcAIManager
      ? {
          ...state.npcAIManager,
          stableStates: Object.fromEntries(
            Object.entries(state.npcAIManager.stableStates).map(([id, s]) => [id, { ...s }]),
          ),
        }
      : undefined;

    let resolvedCount = 0;
    // Build a lookup of race_resolution intents so live-resolved races skip re-simulation
    const resolutionIntents = new Map<string, RaceResolutionIntent>();
    for (const intent of intents) {
      if (intent.type === "race_resolution") {
        resolutionIntents.set(intent.raceId, intent as RaceResolutionIntent);
      }
    }

    for (const race of overdueRaces) {
      resolvedCount++;

      // Check if this race was already resolved live (via race_resolution intent)
      const liveIntent = resolutionIntents.get(race.id);
      if (liveIntent && liveIntent.results.length > 0) {
        // Use the live results directly — do NOT re-simulate
        const result = liveIntent.results.map(({ horseId, position, time }) => ({
          horseId,
          position,
          time,
        }));
        updatedRaces[race.id] = { ...race, resolved: true, result };

        // Still generate impacts (prize money, form, etc.) using the live results
        const rng = rngForRace(race);

        // We need runners for impact generation — build them from the race field
        const { runners: impactRunners } = simulateRace(
          race,
          horseMap,
          jockeyMap,
          state.hiredStaff,
          npcStableMap,
          npcAIManager,
          newDay,
          undefined,
          undefined,
          undefined,
        );

        // Generate race impacts using the live results
        const raceImpacts = generateRaceImpacts({
          race,
          result,
          runners: impactRunners,
          horses: horseMap,
          jockeys: jockeyMap,
          newDay,
          hiredStaff: state.hiredStaff ?? [],
          rng,
          snapshots: [],
          calibratedPars: state.calibratedPars || {},
          raceWeatherState: undefined,
          syndicates: state.syndicates,
          narrativeArcs: state.narrativeArcs,
        });

        for (const impact of raceImpacts) {
          impacts.push(impact);
        }

        // Record NPC AI outcomes
        if (npcAIManager) {
          const runnerByHorseId = new Map(impactRunners.map((r) => [r.horseId, r]));
          for (const res of result) {
            const horse = horseMap.get(res.horseId);
            if (horse && horse.stableId) {
              const stable = npcStableMap.get(horse.stableId);
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
                // 4. Learn from jockey strategy outcomes
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

        // Track record check
        const winnerResult = result.find((r) => r.position === 1);
        const winnerHorse = winnerResult ? horseMap.get(winnerResult.horseId) : null;
        if (winnerResult && winnerHorse) {
          const trackRecord = checkTrackRecord(
            race,
            winnerResult.horseId,
            winnerHorse.name,
            winnerResult.time,
            newDay,
            state.trackRecords || {},
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

        // G1 history & Hall of Fame
        if (race.graded?.grade === "G1") {
          const historyRecord = recordRaceHistory(race, result, impactRunners, horseMap, newDay);
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

        // Claiming resolution
        if (race.claimingPrice) {
          const claimIntents = context.intents.filter(
            (i): i is ClaimingIntent => i.type === "claiming" && i.raceId === race.id,
          );
          if (claimIntents.length > 0) {
            const { impacts: claimingImpacts } = processClaimingResolution({
              race,
              claimIntents,
              horses: Object.values(state.horses),
              newDay,
              rng,
            });
            for (const impact of claimingImpacts) {
              impacts.push(impact);
            }
          }
        }
        continue;
      }

      // Look up current weather for this race's track BEFORE simulating
      // so the granular SimWeatherPattern can be used for weather-preference bonuses.
      const raceTrackId = race.graded?.trackId ?? race.trackId;
      const weatherBuf = raceTrackId ? state.weather?.byTrack?.[raceTrackId] : undefined;
      const raceWeatherState = Array.isArray(weatherBuf)
        ? ((weatherBuf as WeatherState[]).find((w) => w.day === newDay) ??
          (weatherBuf as WeatherState[])[weatherBuf.length - 1])
        : undefined;

      // Simulate race using service
      const { result, runners, snapshots, paceSnapshots } = simulateRace(
        race,
        horseMap,
        jockeyMap,
        state.hiredStaff,
        npcStableMap,
        npcAIManager,
        newDay,
        undefined,
        raceWeatherState?.pattern,
        raceWeatherState?.windKph,
      );

      const rng = rngForRace(race);

      // Update race in the updatedRaces Record
      updatedRaces[race.id] = { ...race, resolved: true, result, snapshots };

      // Record outcomes for NPC AI
      if (npcAIManager) {
        const runnerByHorseId = new Map(runners.map((r) => [r.horseId, r]));
        for (const res of result) {
          const horse = horseMap.get(res.horseId);
          if (horse && horse.stableId) {
            const stable = npcStableMap.get(horse.stableId);
            if (stable) {
              const stableAI = getOrCreateStableAIState(npcAIManager, stable, newDay);

              // 1. Learn from race entry performance
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

              // 2. Learn from jockey performance
              if (stableAI.jockeyAI) {
                const runner = runnerByHorseId.get(res.horseId);
                if (runner && runner.jockeyId) {
                  // Calculate prize money for learning
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

              // 3. Learn from campaign targeting
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

              // 4. Learn from jockey strategy outcomes
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

      // Generate race impacts using service
      const raceImpacts = generateRaceImpacts({
        race,
        result,
        runners,
        horses: horseMap,
        jockeys: jockeyMap,
        newDay,
        hiredStaff: state.hiredStaff ?? [],
        rng,
        snapshots,
        paceSnapshots,
        calibratedPars: state.calibratedPars || {},
        raceWeatherState,
        syndicates: state.syndicates,
        narrativeArcs: state.narrativeArcs,
      });

      for (const impact of raceImpacts) {
        impacts.push(impact);
      }

      // --- Historical Records & Hall of Fame ---
      const winnerResult = result.find((r) => r.position === 1);
      const winnerHorse = winnerResult ? horseMap.get(winnerResult.horseId) : null;

      if (winnerResult && winnerHorse) {
        const trackRecord = checkTrackRecord(
          race,
          winnerResult.horseId,
          winnerHorse.name,
          winnerResult.time,
          newDay,
          state.trackRecords || {},
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

        // Check winner for Hall of Fame induction
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

      // Claiming resolution (if race is claiming race)
      if (race.claimingPrice) {
        const claimIntents = context.intents.filter(
          (i): i is ClaimingIntent => i.type === "claiming" && i.raceId === race.id,
        );

        if (claimIntents.length > 0) {
          const { impacts: claimingImpacts } = processClaimingResolution({
            race,
            claimIntents,
            horses: Object.values(state.horses),
            newDay,
            rng,
          });
          for (const impact of claimingImpacts) {
            impacts.push(impact);
          }
        }
      }
    }

    // Cleanup
    const prunedRaces = Object.fromEntries(
      Object.values(updatedRaces)
        .filter(
          (r) =>
            (!r.resolved && !r.cancelled) || r.day >= newDay - RACE_HISTORY_UNGRADED_RETENTION_DAYS,
        )
        .map((r) => [r.id, r]),
    );

    return {
      ...context,
      state: {
        ...state,
        races: prunedRaces,
        ...(npcAIManager && { npcAIManager }),
      },
      impacts: [...(context.impacts || []), ...impacts],
    };
  },
};
