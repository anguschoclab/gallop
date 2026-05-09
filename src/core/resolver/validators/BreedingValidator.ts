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

export class BreedingValidator implements IntentValidator {
  canValidate(type: AnyIntent["type"]): boolean {
    return type === "breeding";
  }

  validate(
    intent: BreedingIntent,
    state: GameState,
    cache?: ValidationCache,
  ): { valid: boolean; reason?: string } {
    const sire =
      cache?.horseMap?.get(intent.sireId) || state.horses.find((h) => h.id === intent.sireId);
    const dam =
      cache?.horseMap?.get(intent.damId) || state.horses.find((h) => h.id === intent.damId);

    if (!sire) return { valid: false, reason: "Sire not found" };
    if (!dam) return { valid: false, reason: "Dam not found" };
    if (sire.gender !== "horse" && sire.gender !== "gelding")
      return { valid: false, reason: "Invalid sire gender" };
    if (dam.gender !== "mare") return { valid: false, reason: "Invalid dam gender" };
    if (state.cash < 2000) return { valid: false, reason: "Insufficient funds for breeding" };
    return { valid: true };
  }
}
