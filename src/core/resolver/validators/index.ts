import { TrainingValidator } from "./TrainingValidator";
import { RacingValidator } from "./RacingValidator";
import { BreedingValidator } from "./BreedingValidator";
import { MarketValidator } from "./MarketValidator";
import type { IntentValidator } from "./types";

/**
 * Registry of all intent validators
 */
export const ALL_VALIDATORS: IntentValidator[] = [
  new TrainingValidator(),
  new RacingValidator(),
  new BreedingValidator(),
  new MarketValidator(),
];

export * from "./types";
