import type { PipelineContext } from "../pipeline";
import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { runRaceToCompletion } from "@/game/raceSim";

/**
 * Phase: Race Resolution
 * Headless-resolves any unresolved races whose day <= current day
 */
export const raceResolutionPhase = {
  name: "raceResolution",
  order: 10,
  execute: (context: PipelineContext): PipelineContext => {
    const { state } = context;
    const overdueRaces = state.races.filter((r) => !r.resolved && r.day <= state.day);

    for (const race of overdueRaces) {
      const { runners } = buildRaceField({ race, horses: state.horses });
      const rng = rngForRace(race);
      const result = runRaceToCompletion(runners, race.distance, rng);
      // This will call resolveRace which updates state
      // For now, we'll handle this in the main store
      // This phase is a placeholder for the actual resolution logic
    }

    return context;
  },
  skipIf: (context: PipelineContext) => context.skipRaceResolution,
};
