import { type Rng, nondeterministicRng } from "./rng";
import { 
  randomHorseName as coreRandomHorseName, 
  randomSilk as coreRandomSilk,
  randomRaceName as coreRandomRaceName,
  randomJockeyName as coreRandomJockeyName
} from "@/core/common/random";

export function randomHorseName(rng: Rng = nondeterministicRng()) {
  return coreRandomHorseName(rng);
}

export function randomSilk(rng: Rng = nondeterministicRng()) {
  return coreRandomSilk(rng);
}

export function randomRaceName(rng: Rng = nondeterministicRng()) {
  return coreRandomRaceName(rng);
}

export function randomJockeyName(rng: Rng = nondeterministicRng()) {
  return coreRandomJockeyName(rng);
}

// Export the new race name generator
export { generateRaceName, generateRaceCardNames } from "@/core/race/naming/raceNameGenerator";
