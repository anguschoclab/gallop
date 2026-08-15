/**
 * validators/BreedingValidator.ts - Breeding intent validator
 *
 * This file validates breeding intents to ensure sire and dam exist,
 * have valid genders, and sufficient funds are available.
 *
 * Dependencies: @/game/types (GameState), ../intents (AnyIntent, BreedingIntent), ./types (IntentValidator, ValidationCache)
 * Related files: ../resolver.ts (uses validator), ./index.ts (exports validators)
 */

import type { GameState } from "@/game/types";
import type { AnyIntent, BreedingIntent } from "../intents";
import type { IntentValidator, ValidationCache } from "./types";
import { canBreed } from "@/core/breeding/eligibility";
import { SIRE_GENDERS, DAM_GENDERS } from "@/core/horse/gender";

export class BreedingValidator implements IntentValidator {
  canValidate(type: AnyIntent["type"]): boolean {
    return type === "breeding";
  }

  validate(
    intent: BreedingIntent,
    state: GameState,
    cache?: ValidationCache,
  ): { valid: boolean; reason?: string } {
    const sire = cache?.horseMap?.get(intent.sireId) || state.horses[intent.sireId];
    const dam = cache?.horseMap?.get(intent.damId) || state.horses[intent.damId];

    if (!sire) return { valid: false, reason: "Sire not found" };
    if (!dam) return { valid: false, reason: "Dam not found" };
    if (!SIRE_GENDERS.includes(sire.gender))
      return { valid: false, reason: "Invalid sire gender (must be stallion or colt)" };
    if (!DAM_GENDERS.includes(dam.gender))
      return { valid: false, reason: "Invalid dam gender (must be mare or filly)" };
    if (state.cash < 2000) return { valid: false, reason: "Insufficient funds for breeding" };

    const pregnancies = state.pregnancies ?? [];
    const breedCheck = canBreed(sire, dam, state.day ?? 1, pregnancies);
    if (!breedCheck.ok) return { valid: false, reason: breedCheck.reason };

    return { valid: true };
  }
}
