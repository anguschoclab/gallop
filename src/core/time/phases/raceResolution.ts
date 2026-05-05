import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact, RaceResultImpact } from "@/core/resolver/impacts";
import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { runRaceToCompletion } from "@/game/raceSim";
import { getCourseForRace } from "@/game/tracks";
import type { Race } from "@/game/types";

/**
 * Race Resolution Phase (Order 70)
 * Simulates unresolved races and generates race result impacts.
 * The full race resolution (stat updates, prize money, etc.) is still handled
 * by the existing resolveRace function in store.ts.
 * This phase generates RaceResultImpacts that can be used by the resolver.
 */
export const raceResolutionPhase: PipelinePhase = {
  name: "raceResolution",
  order: 70,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Find unresolved races that should be resolved today
    const overdueRaces = state.races.filter((r) => !r.resolved && r.day <= newDay);

    for (const race of overdueRaces) {
      // Simulate race
      const { runners } = buildRaceField({ race, horses: state.horses, jockeys: state.jockeys ?? [] });
      const rng = rngForRace(race);
      const course = getCourseForRace(race);
      const result = runRaceToCompletion(runners, race.distance, rng, 0.1, 600, course);

      // Generate race result impact
      impacts.push({
        id: crypto.randomUUID(),
        intentId: "", // No intent for system-generated race results
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "race_result",
        raceId: race.id,
        results: result.map(({ horseId, position, time }) => ({ horseId, position, time })),
        reason: "Race resolved",
      } as RaceResultImpact);
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
