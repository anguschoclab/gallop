/**
 * validators/index.ts - Intent validators
 *
 * This file exports all intent validators for the resolver system.
 * Validators check if intents are valid before processing.
 *
 * Dependencies: @/platform/resolver/validators/TrainingValidator, ./RacingValidator, ./BreedingValidator, ./MarketValidator, ./SyndicationValidator, ./types (IntentValidator)
 * Related files: ../resolver.ts (uses ALL_VALIDATORS), ../intents.ts (provides intent types)
 */

import { TrainingValidator } from "./TrainingValidator";
import { RacingValidator } from "@/platform/resolver/validators/RacingValidator";
import { BreedingValidator } from "@/platform/resolver/validators/BreedingValidator";
import { MarketValidator } from "@/platform/resolver/validators/MarketValidator";
import { SyndicationValidator } from "@/platform/resolver/validators/SyndicationValidator";
import { StructuralIntentValidator } from "@/platform/resolver/validators/structuralIntentValidator";
import type { IntentValidator } from "@/platform/resolver/validators/types";

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

export * from "@/platform/resolver/validators/types";
