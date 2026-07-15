/**
 * validators/TrainingValidator.ts - Training intent validator
 *
 * This file validates training intents to ensure horses exist, have sufficient energy,
 * and are not consigned to an auction.
 *
 * Dependencies: @/game/types (GameState), ../intents (AnyIntent, TrainingIntent), ./types (IntentValidator, ValidationCache)
 * Related files: ../resolver.ts (uses validator), ./index.ts (exports validators)
 */

import type { GameState } from "@/game/types";
import type { AnyIntent, TrainingIntent } from "../intents";
import type { IntentValidator, ValidationCache } from "./types";

export class TrainingValidator implements IntentValidator {
  canValidate(type: AnyIntent["type"]): boolean {
    return type === "training";
  }

  validate(
    intent: TrainingIntent,
    state: GameState,
    cache?: ValidationCache,
  ): { valid: boolean; reason?: string } {
    const horse = cache?.horseMap?.get(intent.horseId) || state.horses[intent.horseId];
    if (!horse) return { valid: false, reason: "Horse not found" };
    if (horse.consignedSaleId) return { valid: false, reason: "Horse is consigned to an auction" };
    if (horse.energy < 20) return { valid: false, reason: "Insufficient energy" };
    return { valid: true };
  }
}
