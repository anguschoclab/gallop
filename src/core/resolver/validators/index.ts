/**
 * validators/index.ts - Intent validators
 *
 * This file exports all intent validators for the resolver system.
 * Validators check if intents are valid before processing.
 *
 * Dependencies: ./TrainingValidator, ./RacingValidator, ./BreedingValidator, ./MarketValidator, ./SyndicationValidator, ./types (IntentValidator)
 * Related files: ../resolver.ts (uses ALL_VALIDATORS), ../intents.ts (provides intent types)
 */

import { TrainingValidator } from "./TrainingValidator";
import { RacingValidator } from "./RacingValidator";
import { BreedingValidator } from "./BreedingValidator";
import { MarketValidator } from "./MarketValidator";
import { SyndicationValidator } from "./SyndicationValidator";
import { StructuralIntentValidator } from "./structuralIntentValidator";
import type { IntentValidator } from "./types";

/**
 * Registry of all intent validators
 */
export const ALL_VALIDATORS: IntentValidator[] = [
  new TrainingValidator(),
  new RacingValidator(),
  new BreedingValidator(),
  new MarketValidator(),
  new SyndicationValidator(),
  new StructuralIntentValidator(),
];

export * from "./types";
