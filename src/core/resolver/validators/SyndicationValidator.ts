/**
 * validators/SyndicationValidator.ts - Syndication intent validator
 *
 * This file validates syndication intents to ensure stallions are G1 winners,
 * share transactions are valid, and sufficient funds are available.
 *
 * Dependencies: @/game/types (GameState), ../intents (AnyIntent, SyndicateCreationIntent, SharePurchaseIntent, ShareSaleIntent), ./types (IntentValidator, ValidationCache)
 * Related files: ../resolver.ts (uses validator), ./index.ts (exports validators)
 */

import type { GameState } from "@/game/types";
import type {
  AnyIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
} from "../intents";
import type { IntentValidator, ValidationCache } from "./types";

export class SyndicationValidator implements IntentValidator {
  canValidate(type: AnyIntent["type"]): boolean {
    return [
      "syndicate_creation",
      "share_purchase",
      "share_sale",
    ].includes(type);
  }

  validate(
    intent: AnyIntent,
    state: GameState,
    cache?: ValidationCache,
  ): { valid: boolean; reason?: string } {
    switch (intent.type) {
      case "syndicate_creation": {
        const syndicateIntent = intent as SyndicateCreationIntent;
        const stallion =
          cache?.horseMap?.get(syndicateIntent.stallionId) ||
          state.horses.find((h) => h.id === syndicateIntent.stallionId);

        if (!stallion) return { valid: false, reason: "Stallion not found" };
        
        // Validate stallion is a G1 winner
        const g1Wins = stallion.raceHistory?.filter((r: any) => r.grade === "G1" && r.position === 1).length || 0;
        if (g1Wins === 0) return { valid: false, reason: "Stallion must be a G1 winner" };

        // Validate total shares
        if (syndicateIntent.totalShares < 10 || syndicateIntent.totalShares > 100) {
          return { valid: false, reason: "Total shares must be between 10 and 100" };
        }

        // Validate share price
        if (syndicateIntent.sharePrice < 1000) {
          return { valid: false, reason: "Share price must be at least $1,000" };
        }

        // Validate initial shareholders don't exceed total
        const totalInitialShares = Object.values(syndicateIntent.initialShareholders).reduce((sum, count) => sum + count, 0);
        if (totalInitialShares > syndicateIntent.totalShares) {
          return { valid: false, reason: "Initial shares exceed total shares" };
        }

        return { valid: true };
      }

      case "share_purchase": {
        const purchaseIntent = intent as SharePurchaseIntent;
        const syndicate = state.syndicates?.[purchaseIntent.syndicateId];

        if (!syndicate) return { valid: false, reason: "Syndicate not found" };

        // Validate shares available
        const totalOwned = Object.values(syndicate.shareHolders).reduce((sum, count) => sum + count, 0);
        if (totalOwned + purchaseIntent.shares > syndicate.totalShares) {
          return { valid: false, reason: "Insufficient shares available" };
        }

        // Validate sufficient funds
        const totalCost = purchaseIntent.shares * purchaseIntent.pricePerShare;
        if (state.cash < totalCost) {
          return { valid: false, reason: "Insufficient funds to purchase shares" };
        }

        return { valid: true };
      }

      case "share_sale": {
        const saleIntent = intent as ShareSaleIntent;
        const syndicate = state.syndicates?.[saleIntent.syndicateId];

        if (!syndicate) return { valid: false, reason: "Syndicate not found" };

        // Validate seller owns enough shares
        const sellerId = saleIntent.sellerStableId || "player";
        const currentShares = syndicate.shareHolders[sellerId] || 0;
        if (currentShares < saleIntent.shares) {
          return { valid: false, reason: "Insufficient shares to sell" };
        }

        return { valid: true };
      }

      default:
        return { valid: false, reason: "Unknown syndication intent type" };
    }
  }
}
