/**
 * resolvers/syndicateResolver.ts - Syndication intent resolver
 *
 * This file resolves syndication intents into impacts for the handler system.
 * It converts syndication intents (creation, share purchase/sale, fee distribution)
 * into corresponding impacts that modify the game state.
 *
 * Dependencies: @/game/types (GameState), ../intents (AnyIntent, SyndicateCreationIntent, SharePurchaseIntent, ShareSaleIntent, SyndicateFeeDistributionIntent), ../impacts/breedingImpacts (SyndicateCreationImpact, ShareTransactionImpact, SyndicateFeeDistributionImpact), @/game/uuid (generateUUID)
 * Related files: ../resolver.ts (uses resolver), ../handlers/SyndicationHandler.ts (handles impacts)
 */

import type { GameState, Horse } from "@/game/types";
import type {
  AnyIntent,
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
  SyndicateFeeDistributionIntent,
} from "../intents";
import type {
  SyndicateCreationImpact,
  ShareTransactionImpact,
  SyndicateFeeDistributionImpact,
} from "../impacts/breedingImpacts";
import { generateUUID } from "@/core/uuid";

/**
 * Resolve syndication intents into impacts.
 *
 * Converts syndication intents into impacts that the SyndicationHandler
 * will apply to the game state.
 *
 * @param intent - The syndication intent to resolve
 * @param state - Current game state
 * @param day - Current game day
 * @param horseMap - Optional pre-built map of horses for O(1) lookup
 * @returns Array of impacts to apply
 */
export function resolveSyndicationIntent(
  intent: AnyIntent,
  state: GameState,
  day: number,
  horseMap?: Map<string, Horse>,
): (SyndicateCreationImpact | ShareTransactionImpact | SyndicateFeeDistributionImpact)[] {
  switch (intent.type) {
    case "syndicate_creation": {
      const syndicateIntent = intent as SyndicateCreationIntent;
      const stallion =
        horseMap?.get(syndicateIntent.stallionId) ||
        Object.values(state.horses).find((h) => h.id === syndicateIntent.stallionId);

      if (!stallion) return [];

      const impact: SyndicateCreationImpact = {
        id: generateUUID(),
        intentId: intent.id,
        day,
        phase: "management_resolution",
        logLevel: "always",
        type: "syndicate_creation",
        syndicateId: `syndicate_${syndicateIntent.stallionId}`,
        stallionId: syndicateIntent.stallionId,
        stallionName: stallion.name,
        totalShares: syndicateIntent.totalShares,
        sharePrice: syndicateIntent.sharePrice,
        initialShareholders: syndicateIntent.initialShareholders,
        reason: `Syndicate created for ${stallion.name}`,
      };

      return [impact];
    }

    case "share_purchase": {
      const purchaseIntent = intent as SharePurchaseIntent;
      const syndicate = state.syndicates?.[purchaseIntent.syndicateId];

      if (!syndicate) return [];

      const impact: ShareTransactionImpact = {
        id: generateUUID(),
        intentId: intent.id,
        day,
        phase: "management_resolution",
        logLevel: "conditional",
        type: "share_transaction",
        syndicateId: purchaseIntent.syndicateId,
        stableId: purchaseIntent.buyerStableId || "player",
        buyerStableId: purchaseIntent.buyerStableId || "player",
        sellerStableId: "treasury",
        shares: purchaseIntent.shares,
        pricePerShare: purchaseIntent.pricePerShare,
        reason: `Purchased ${purchaseIntent.shares} shares in ${syndicate.stallionName}`,
      };

      return [impact];
    }

    case "share_sale": {
      const saleIntent = intent as ShareSaleIntent;
      const syndicate = state.syndicates?.[saleIntent.syndicateId];

      if (!syndicate) return [];

      const impact: ShareTransactionImpact = {
        id: generateUUID(),
        intentId: intent.id,
        day,
        phase: "management_resolution",
        logLevel: "conditional",
        type: "share_transaction",
        syndicateId: saleIntent.syndicateId,
        stableId: saleIntent.sellerStableId || "player",
        buyerStableId: "market",
        sellerStableId: saleIntent.sellerStableId || "player",
        shares: -saleIntent.shares, // Negative for sales
        pricePerShare: saleIntent.pricePerShare,
        reason: `Sold ${saleIntent.shares} shares in ${syndicate.stallionName}`,
      };

      return [impact];
    }

    case "syndicate_fee_distribution": {
      const feeIntent = intent as SyndicateFeeDistributionIntent;
      const syndicate = state.syndicates?.[feeIntent.syndicateId];

      if (!syndicate) return [];

      const impact: SyndicateFeeDistributionImpact = {
        id: generateUUID(),
        intentId: intent.id,
        day,
        phase: "race_resolution",
        logLevel: "conditional",
        type: "syndicate_fee_distribution",
        syndicateId: feeIntent.syndicateId,
        totalFee: feeIntent.totalFee,
        breedingDay: feeIntent.breedingDay,
        reason: `Distributed stud fee dividends for ${syndicate.stallionName}`,
      };

      return [impact];
    }

    default:
      return [];
  }
}
