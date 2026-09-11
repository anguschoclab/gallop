/**
 * rngForRace.ts - Deterministic RNG for a race
 *
 * Creates a seeded RNG from a race's ID, ensuring reproducible
 * race simulations for the same race.
 *
 * Dependencies: @/core/common/rng (createRng, hashStr), @/game/types (Race)
 * Related files: src/services/race/raceSimulationService.ts (re-export)
 */

import { createRng, hashStr } from "@/core/common/rng";
import type { Race } from "@/game/types";
import type { Rng } from "@/core/common/rng";

export function rngForRace(race: Pick<Race, "id">): Rng {
  return createRng(hashStr(race.id));
}
