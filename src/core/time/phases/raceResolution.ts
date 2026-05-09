/**
 * phases/raceResolution.ts - Race resolution phase
 *
 * This file provides the race resolution phase that simulates unresolved races
 * and generates all race resolution impacts.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/impacts/index (AnyImpact), @/services/raceSimulationService (rngForRace), @/game/types (Race), @/core/resolver/intents (ClaimingIntent), @/services/raceSimulationExecutor (simulateRace), @/services/raceImpactGenerator (generateRaceImpacts), @/services/claimingResolutionService (processClaimingResolution), @/services/historyService (recordRaceHistory, checkHallOfFameInduction), @/game/uuid (generateUUID), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/core/ai/raceEntryAI (recordRaceEntryOutcome), @/core/ai/jockeyAI (recordJockeyOutcome), @/core/ai/campaignAI (recordCampaignOutcome)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import { rngForRace } from "@/services/raceSimulationService";
import type { Race } from "@/game/types";
import type { ClaimingIntent } from "@/core/resolver/intents";
import { simulateRace } from "@/services/raceSimulationExecutor";
import { generateRaceImpacts } from "@/services/raceImpactGenerator";
import { processClaimingResolution } from "@/services/claimingResolutionService";
import { 
  recordRaceHistory, 
  checkHallOfFameInduction,
  checkTrackRecord 
} from "@/services/historyService";
import { generateUUID } from "@/game/uuid";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { recordRaceEntryOutcome } from "@/core/ai/raceEntryAI";
import { recordJockeyOutcome } from "@/core/ai/jockeyAI";
import { recordCampaignOutcome } from "@/core/ai/campaignAI";
import { PRIZE_SPLIT } from "@/game/constants/gameConstants";

/**
 * Race Resolution Phase (Order 70)
 * Simulates unresolved races and generates all race resolution impacts.
 */
export const raceResolutionPhase: PipelinePhase = {
  name: "raceResolution",
  order: 70,
  skipIf: (context) => !!context.skipRaceResolution,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];
    const updatedRaces: typeof state.races = [...state.races];
    const overdueRaces = state.races.filter((r) => !r.resolved && r.day <= newDay);
    
    if (overdueRaces.length > 0) {
      console.log(`      - Resolving ${overdueRaces.length} races...`);
    }

    // PRE-INDEX: Create maps for O(1) lookups during resolution
    const horseMap = new Map(state.horses.map(h => [h.id, h]));
    const npcStableMap = new Map(state.npcStables.map(s => [s.id, s]));
    const jockeyMap = new Map((state.jockeys || []).map(j => [j.id, j]));

    let resolvedCount = 0;
    for (const race of overdueRaces) {
      resolvedCount++;
      
      // Simulate race using service
      const { result, runners, snapshots } = simulateRace(
        race,
        horseMap,
        jockeyMap,
        state.hiredStaff,
        npcStableMap,
        state.npcAIManager,
        newDay
      );

      const rng = rngForRace(race);

      // Update race in the updatedRaces array
      const raceIndex = updatedRaces.findIndex((r) => r.id === race.id);
      if (raceIndex !== -1) {
        updatedRaces[raceIndex] = { ...race, resolved: true, result, snapshots };
      }

      // Record outcomes for NPC AI
      if (state.npcAIManager) {
        for (const res of result) {
          const horse = horseMap.get(res.horseId);
          if (horse && horse.stableId) {
            const stable = npcStableMap.get(horse.stableId);
            if (stable) {
              const stableAI = getOrCreateStableAIState(state.npcAIManager, stable, newDay);
              
              // 1. Learn from race entry performance
              if (stableAI.raceEntryAI) {
                stableAI.raceEntryAI = recordRaceEntryOutcome(
                  stableAI.raceEntryAI,
                  horse,
                  race,
                  newDay,
                  res.position <= 3,
                  res.position
                );
              }

              // 2. Learn from jockey performance
              if (stableAI.jockeyAI) {
                 const runner = runners.find(r => r.horseId === res.horseId);
                 if (runner && runner.jockeyId) {
                    // Calculate prize money for learning
                    const prize = res.position <= PRIZE_SPLIT.length 
                      ? Math.round(race.purse * PRIZE_SPLIT[res.position - 1]) 
                      : 0;
                    
                    stableAI.jockeyAI = recordJockeyOutcome(
                      stableAI.jockeyAI,
                      runner.jockeyId,
                      res.horseId,
                      race.id,
                      res.position,
                      prize,
                      newDay
                    );
                 }
              }

              // 3. Learn from campaign targeting
              if (stableAI.campaignAI && race.graded?.key) {
                 const prize = res.position <= PRIZE_SPLIT.length 
                   ? Math.round(race.purse * PRIZE_SPLIT[res.position - 1]) 
                   : 0;

                 stableAI.campaignAI = recordCampaignOutcome(
                   stableAI.campaignAI,
                   res.horseId,
                   race.graded.key,
                   res.position,
                   prize,
                   newDay
                 );
              }

              state.npcAIManager.stableStates[stable.id] = stableAI;
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
        stateCash: state.cash,
        stateReputation: state.reputation,
        hiredStaff: state.hiredStaff ?? [],
        rng,
        snapshots,
        calibratedPars: state.calibratedPars || {},
      });

      for (const impact of raceImpacts) {
        impacts.push(impact);
      }

      // --- Historical Records & Hall of Fame ---
      const winnerResult = result.find(r => r.position === 1);
      const winnerHorse = winnerResult ? horseMap.get(winnerResult.horseId) : null;

      if (winnerResult && winnerHorse) {
        const trackRecord = checkTrackRecord(
          race,
          winnerResult.horseId,
          winnerHorse.name,
          winnerResult.time,
          newDay,
          state.trackRecords || {}
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
            reason: "New track record set!"
          } as any);
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
            record: historyRecord
          } as any);
        }

        // Check winner for Hall of Fame induction
        const winnerId = result.find(r => r.position === 1)?.horseId;
        const winner = winnerId ? horseMap.get(winnerId) : null;
        if (winner && winner.id) {
          const prizeMoney = race.purse * 0.6;
          const tempHorse = {
            ...winner,
            lifetimeEarnings: winner.lifetimeEarnings + prizeMoney,
            careerWins: winner.careerWins + 1,
            raceHistory: [
              ...winner.raceHistory,
              { grade: "G1", position: 1, day: newDay } as any
            ]
          };

          const hofEntry = checkHallOfFameInduction(tempHorse, newDay);
          if (hofEntry && !state.hallOfFame.find(e => e.horseId === winner.id)) {
            impacts.push({
              id: generateUUID(),
              intentId: race.id,
              day: newDay,
              phase: "raceResolution",
              logLevel: "always",
              type: "hall_of_fame_induction",
              entry: hofEntry,
              reason: "G1 winner reached HoF criteria",
            } as any);
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
            horses: state.horses,
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
    const prunedRaces = updatedRaces.filter((r) => !r.resolved || r.day >= newDay - 30);

    return {
      ...context,
      state: {
        ...state,
        races: prunedRaces,
      },
      impacts: [...(context.impacts || []), ...impacts],
    };
  },
};
