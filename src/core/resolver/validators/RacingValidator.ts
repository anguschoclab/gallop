/**
 * validators/RacingValidator.ts - Racing intent validator
 *
 * This file validates race entry, race withdrawal, and claiming withdrawal intents
 * to ensure horses exist, have sufficient energy, races are valid, and horses are not consigned.
 *
 * Dependencies: @/game/types (GameState), ../intents (AnyIntent, RaceEntryIntent, WithdrawFromClaimingIntent), ./types (IntentValidator, ValidationCache)
 * Related files: ../resolver.ts (uses validator), ./index.ts (exports validators)
 */

import type { GameState } from "@/game/types";
import type { AnyIntent, RaceEntryIntent, WithdrawFromClaimingIntent } from "../intents";
import type { IntentValidator, ValidationCache } from "./types";

export class RacingValidator implements IntentValidator {
  canValidate(type: AnyIntent["type"]): boolean {
    return type === "race_entry" || type === "withdraw_from_claiming" || type === "race_withdrawal";
  }

  validate(
    intent: AnyIntent,
    state: GameState,
    cache?: ValidationCache,
  ): { valid: boolean; reason?: string } {
    switch (intent.type) {
      case "race_entry": {
        const raceIntent = intent as RaceEntryIntent;
        const horse =
          cache?.horseMap?.get(raceIntent.horseId) ||
          state.horses.find((h) => h.id === raceIntent.horseId);
        const race =
          cache?.raceMap?.get(raceIntent.raceId) ||
          state.races.find((r) => r.id === raceIntent.raceId);

        if (!horse) return { valid: false, reason: "Horse not found" };
        if (horse.consignedSaleId)
          return { valid: false, reason: "Horse is consigned to an auction" };
        if (!race) return { valid: false, reason: "Race not found" };
        if (race.resolved) return { valid: false, reason: "Race already resolved" };
        if (horse.energy < 40) return { valid: false, reason: "Insufficient energy" };
        break;
      }

      case "withdraw_from_claiming": {
        const withdrawIntent = intent as WithdrawFromClaimingIntent;
        const race =
          cache?.raceMap?.get(withdrawIntent.raceId) ||
          state.races.find((r) => r.id === withdrawIntent.raceId);
        const horse =
          cache?.horseMap?.get(withdrawIntent.horseId) ||
          state.horses.find((h) => h.id === withdrawIntent.horseId);

        if (!race) return { valid: false, reason: "Race not found" };
        if (!horse) return { valid: false, reason: "Horse not found" };
        if (race.resolved) return { valid: false, reason: "Race already resolved" };
        if (!race.claimingPrice) return { valid: false, reason: "Race is not a claiming race" };
        if (race.raceClass !== "OptionalClaiming" && race.raceClass !== "MaidenOptionalClaiming") {
          return { valid: false, reason: "Withdrawal only allowed in optional claiming races" };
        }
        const entry = race.entries.find((e) => e.horseId === withdrawIntent.horseId);
        if (!entry) return { valid: false, reason: "Horse not entered in this race" };
        if (entry.withdrawnFromClaiming) {
          return { valid: false, reason: "Horse already withdrawn from claiming" };
        }
        break;
      }
    }

    return { valid: true };
  }
}
