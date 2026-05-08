import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact } from "@/core/resolver/impacts";
import { rngForRace } from "@/services/raceSimulationService";
import type { Race, Horse } from "@/game/types";
import type { ClaimingIntent } from "@/core/resolver/intents";
import { getReputationTier } from "@/core/reputation";
import { simulateRace } from "@/services/raceSimulationExecutor";
import { generateRaceImpacts } from "@/services/raceImpactGenerator";
import { processClaimingResolution } from "@/services/claimingResolutionService";
import { recordRaceHistory, checkHallOfFameInduction } from "@/services/historyService";
import { generateUUID } from "@/game/uuid";

/**
 * Race Resolution Phase (Order 70)
 * Simulates unresolved races and generates all race resolution impacts.
 * This replaces the old resolveRace function with impact-based resolution.
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

    for (const race of overdueRaces) {
      // Simulate race using service
      const { result, runners, snapshots } = simulateRace(
        race,
        state.horses,
        state.jockeys ?? [],
        state.hiredStaff,
        state.npcStables,
      );
      const rng = rngForRace(race);

      // Update race in the updatedRaces array
      const raceIndex = updatedRaces.findIndex((r) => r.id === race.id);
      if (raceIndex !== -1) {
        updatedRaces[raceIndex] = { ...race, resolved: true, result, snapshots };
      }

      // Generate race impacts using service
      const raceImpacts = generateRaceImpacts({
        race,
        result,
        runners,
        horses: state.horses,
        jockeys: state.jockeys ?? [],
        newDay,
        stateCash: state.cash,
        stateReputation: state.reputation,
        hiredStaff: state.hiredStaff ?? [],
        rng,
        snapshots,
      });

      impacts.push(...raceImpacts);

      // --- Historical Records & Hall of Fame ---
      if (race.graded?.grade === "G1") {
        const historyRecord = recordRaceHistory(race, result, runners, state.horses, newDay);
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
        const winner = state.horses.find(h => h.id === winnerId);
        if (winner) {
          // Calculate temporary stats to see if they cross the threshold
          const prizeMoney = race.purse * 0.6; // Winner gets 60%
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
              reason: `${winner.name} reaches legendary status after winning ${race.name}!`
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
          impacts.push(...claimingImpacts);
        }
      }
    }

    return {
      ...context,
      state: {
        ...state,
        races: updatedRaces,
      },
      impacts: [...(context.impacts || []), ...impacts],
    };
  },
};
