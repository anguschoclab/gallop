/**
 * validators/MarketValidator.ts - Market intent validator
 *
 * This file validates purchase and claiming intents to ensure horses exist,
 * are eligible for claiming, and sufficient funds are available.
 *
 * Dependencies: @/game/types (GameState), ../intents (AnyIntent, PurchaseIntent, ClaimingIntent), ./types (IntentValidator, ValidationCache), @/game/claiming (isHorseEligibleForClaimingPrice)
 * Related files: ../resolver.ts (uses validator), ./index.ts (exports validators)
 */

import type { GameState } from "@/game/types";
import type { AnyIntent, PurchaseIntent, ClaimingIntent } from "../intents";
import type { IntentValidator, ValidationCache } from "./types";
import { isHorseEligibleForClaimingPrice } from "@/core/market/claiming";

export class MarketValidator implements IntentValidator {
  canValidate(type: AnyIntent["type"]): boolean {
    return type === "purchase" || type === "claiming";
  }

  validate(
    intent: AnyIntent,
    state: GameState,
    cache?: ValidationCache,
  ): { valid: boolean; reason?: string } {
    switch (intent.type) {
      case "purchase": {
        const purchaseIntent = intent as PurchaseIntent;
        const horse = state.market.find((h) => h.id === purchaseIntent.horseId);
        if (!horse) return { valid: false, reason: "Horse not in market" };
        if (state.cash < purchaseIntent.price)
          return { valid: false, reason: "Insufficient funds" };
        break;
      }

      case "claiming": {
        const claimingIntent = intent as ClaimingIntent;
        const race =
          cache?.raceMap?.get(claimingIntent.raceId) ||
          state.races.find((r) => r.id === claimingIntent.raceId);
        const horse =
          cache?.horseMap?.get(claimingIntent.horseId) ||
          state.horses.find((h) => h.id === claimingIntent.horseId);

        if (!race) return { valid: false, reason: "Race not found" };
        if (!horse) return { valid: false, reason: "Horse not found" };
        if (horse.consignedSaleId)
          return { valid: false, reason: "Horse is consigned to an auction" };
        if (!race.claimingPrice) return { valid: false, reason: "Race is not a claiming race" };
        if (!race.entries.some((e) => e.horseId === claimingIntent.horseId)) {
          return { valid: false, reason: "Horse is not entered in this race" };
        }
        if (horse.stableId === claimingIntent.claimantStableId) {
          return { valid: false, reason: "Cannot claim own horse" };
        }

        // Check claimant has sufficient funds
        if (claimingIntent.claimantStableId) {
          const stable =
            cache?.stableMap?.get(claimingIntent.claimantStableId) ||
            state.npcStables.find((s) => s.id === claimingIntent.claimantStableId);
          if (!stable || stable.cash < race.claimingPrice) {
            return { valid: false, reason: "Insufficient funds" };
          }
        } else {
          if (state.cash < race.claimingPrice) {
            return { valid: false, reason: "Insufficient funds" };
          }
        }

        // Check horse eligibility for claiming price
        if (!isHorseEligibleForClaimingPrice(horse, race.claimingPrice, state.horses)) {
          return { valid: false, reason: "Horse is not eligible for this claiming price" };
        }
        break;
      }
    }

    return { valid: true };
  }
}
