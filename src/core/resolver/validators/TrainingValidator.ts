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
    const horse =
      cache?.horseMap?.get(intent.horseId) || state.horses.find((h) => h.id === intent.horseId);
    if (!horse) return { valid: false, reason: "Horse not found" };
    if (horse.consignedSaleId) return { valid: false, reason: "Horse is consigned to an auction" };
    if (horse.energy < 20) return { valid: false, reason: "Insufficient energy" };
    return { valid: true };
  }
}
