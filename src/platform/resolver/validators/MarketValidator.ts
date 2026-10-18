/**
 * validators/MarketValidator.ts - Market intent validator
 *
 * This file validates purchase and claiming intents to ensure horses exist,
 * are eligible for claiming, and sufficient funds are available.
 *
 * Dependencies: @/game/types (GameState), ../intents (AnyIntent, PurchaseIntent, ClaimingIntent), ./types (IntentValidator, ValidationCache), @/game/claiming (isHorseEligibleForClaimingPrice)
 * Related files: ../resolver.ts (uses validator), ./index.ts (exports validators)
 */

import type { GameState } from "@/platform/game/types";
import type { AnyIntent, PurchaseIntent, ClaimingIntent } from "@/platform/resolver/intents";
import type { IntentValidator, ValidationCache } from "@/platform/resolver/validators/types";
import { isHorseEligibleForClaimingPrice } from "@/domains/market/simulation/claiming";
import type { ClaimingPrice } from "@/domains/race/simulation/types";

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
          cache?.raceMap?.get(claimingIntent.raceId) || state.races[claimingIntent.raceId];
        const horse =
          cache?.horseMap?.get(claimingIntent.horseId) || state.horses[claimingIntent.horseId];

        if (!race) return { valid: false, reason: "Race not found" };
        if (!horse) return { valid: false, reason: "Horse not found" };
        if (race.resolved) return { valid: false, reason: "Race already resolved" };
        if (horse.consignedSaleId)
          return { valid: false, reason: "Horse is consigned to an auction" };
        const claimingPrice = race.claimingPrice;
        if (!claimingPrice) return { valid: false, reason: "Race is not a claiming race" };
        if (claimingIntent.claimingPrice !== claimingPrice) {
          return { valid: false, reason: "Claiming price mismatch" };
        }
        const entry = race.entries.find((e) => e.horseId === claimingIntent.horseId);
        if (!entry) {
          return { valid: false, reason: "Horse is not entered in this race" };
        }
        const claimantStableId =
          claimingIntent.source === "player" ? undefined : claimingIntent.claimantStableId;
        if (claimingIntent.source === "npc" && !claimantStableId) {
          return { valid: false, reason: "Claiming stable not found" };
        }
        if (entry.ownership.type === "player" && claimantStableId === undefined) {
          return { valid: false, reason: "Cannot claim own horse" };
        }
        if (entry.ownership.type === "npc" && entry.ownership.stableId === claimantStableId) {
          return { valid: false, reason: "Cannot claim own horse" };
        }
        if (
          state.claims?.some(
            (claim) =>
              claim.raceId === claimingIntent.raceId &&
              claim.horseId === claimingIntent.horseId &&
              claim.claimantStableId === claimantStableId,
          )
        ) {
          return { valid: false, reason: "Claim already filed" };
        }

        // Check claimant has sufficient funds
        if (claimantStableId) {
          const stable =
            cache?.stableMap?.get(claimantStableId) ||
            state.npcStables.find((s) => s.id === claimantStableId);
          if (!stable) return { valid: false, reason: "Claiming stable not found" };
          if (stable.cash < claimingPrice) {
            return { valid: false, reason: "Insufficient funds" };
          }
        } else if (state.cash < claimingPrice) {
          return { valid: false, reason: "Insufficient funds" };
        }

        // Check horse eligibility for claiming price
        if (
          !isHorseEligibleForClaimingPrice(
            horse,
            claimingPrice as ClaimingPrice,
            Object.values(state.horses),
          )
        ) {
          return { valid: false, reason: "Horse is not eligible for this claiming price" };
        }
        break;
      }
    }

    return { valid: true };
  }
}
