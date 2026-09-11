/**
 * trainingActions.ts — Pure helpers for training validation.
 * Extracted from racingSlice.ts per PR 7 of the megaplan.
 *
 * Dependencies: @/game/types (Horse), @/core/horse/ownership, @/constants
 */

import type { Horse } from "@/game/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import {
  TRAINING_COST,
  TRAINING_MIN_ENERGY_ATTEMPT,
  TRAINING_MIN_ENERGY_THRESHOLD,
} from "@/constants/workoutConstants";

export const TRAINING_SLOTS_PER_DAY = 2;

export interface TrainingValidationInput {
  horse: Horse | undefined;
  horseId: string;
  isPregnant: boolean;
  trainingUsedToday: number;
  cash: number;
  availableTrainingTypes: string[];
  requestedTrainingType: string;
}

export interface TrainingValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate whether a horse can be trained.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Training validation inputs
 * @returns Validation result
 */
export function validateTraining(input: TrainingValidationInput): TrainingValidationResult {
  const {
    horse,
    horseId,
    isPregnant,
    trainingUsedToday,
    cash,
    availableTrainingTypes,
    requestedTrainingType,
  } = input;

  if (!horse) return { ok: false };
  if (!isPlayerOwned(horse)) return { ok: false };
  if (isPregnant) return { ok: false };

  if (horse.healthStatus === "covering_sickness" || horse.healthStatus === "recovering") {
    return {
      ok: false,
      reason: `Training blocked: ${horse.name} is ${horse.healthStatus === "covering_sickness" ? "sick with covering sickness (dourine)" : "recovering from illness"}. Horse cannot be trained while recovering.`,
    };
  }

  if (trainingUsedToday >= TRAINING_SLOTS_PER_DAY) return { ok: false };
  if (horse.energy < TRAINING_MIN_ENERGY_ATTEMPT) return { ok: false };

  const isRest = requestedTrainingType === "rest";
  if (!isRest && cash < TRAINING_COST) return { ok: false };
  if (!isRest && horse.energy < TRAINING_MIN_ENERGY_THRESHOLD) return { ok: false };

  if (
    availableTrainingTypes.length > 0 &&
    !availableTrainingTypes.includes(requestedTrainingType)
  ) {
    return {
      ok: false,
      reason: `Training blocked: ${requestedTrainingType} is not available at your current facility level. Upgrade your barn or build the required facility.`,
    };
  }

  return { ok: true };
}
