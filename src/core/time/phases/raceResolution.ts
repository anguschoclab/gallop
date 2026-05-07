import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact } from "@/core/resolver/impacts";
import { rngForRace } from "@/services/raceSimulationService";
import type { Race, Horse } from "@/game/types";
import type { ClaimingIntent } from "@/core/resolver/intents";
import { getReputationTier } from "@/core/reputation";
import { simulateRace } from "@/services/raceSimulationExecutor";
import { generateRaceImpacts } from "@/services/raceImpactGenerator";
import { processClaimingResolution } from "@/services/claimingResolutionService";

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
    const newTransactions: typeof state.transactions = [];
    const updatedRaces: typeof state.races = [...state.races];
    const newReputationEvents = state.reputation?.events ?? [];

    // Find unresolved races that should be resolved today
    const overdueRaces = state.races.filter((r) => !r.resolved && r.day <= newDay);

    for (const race of overdueRaces) {
      // Simulate race using service
      const { result, runners } = simulateRace(race, state.horses, state.jockeys ?? []);
      const rng = rngForRace(race);

      // Update race in the updatedRaces array
      const raceIndex = updatedRaces.findIndex((r) => r.id === race.id);
      if (raceIndex !== -1) {
        updatedRaces[raceIndex] = { ...race, resolved: true, result };
      }

      // Generate race impacts using service
      const { impacts: raceImpacts, transactions: raceTransactions, reputationEvents: raceReputationEvents } = generateRaceImpacts({
        race,
        result,
        runners,
        horses: state.horses,
        jockeys: state.jockeys ?? [],
        newDay,
        stateCash: state.cash,
        stateReputation: state.reputation,
      });

      impacts.push(...raceImpacts);
      newTransactions.push(...raceTransactions);
      newReputationEvents.push(...raceReputationEvents);

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
        transactions: [...(state.transactions ?? []), ...newTransactions],
        reputation: state.reputation
          ? {
              ...state.reputation,
              events: [...state.reputation.events, ...newReputationEvents],
              score:
                state.reputation.score + newReputationEvents.reduce((sum, e) => sum + e.amount, 0),
              tier: getReputationTier(
                state.reputation.score + newReputationEvents.reduce((sum, e) => sum + e.amount, 0),
              ),
              totalWins:
                state.reputation.totalWins +
                newReputationEvents.filter((e) => e.source === "race_win").length,
            }
          : state.reputation,
      },
      impacts: [...(context.impacts || []), ...impacts],
    };
  },
};
