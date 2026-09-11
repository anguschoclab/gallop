/**
 * raceSimulationService.ts - Re-export from @/core/race/raceSimulationService
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing service/component/hook importers working during the transition.
 *
 * @deprecated Import from @/core/race/raceSimulationService instead.
 */

export {
  rngForRace,
  buildRaceField,
  simulateStep,
  getRaceClassBonus,
  type RaceSimulationDependencies,
  type SimulationResult,
  type RaceFieldResult,
} from "@/core/race/raceSimulationService";
