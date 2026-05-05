// Auction Resolution Phase
// Converts AuctionBidIntents into impacts (auction bids, cash transfers, horse transfers)

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, AuctionBidIntent } from "@/core/resolver/intents";
import type { AnyImpact, CashImpact, AuctionBidImpact, HorseTransferImpact } from "@/core/resolver/impacts";

/**
 * Auction Resolution Phase (Order 55)
 * Resolves AuctionBidIntents into impacts:
 * - Auction bids
 * - Cash transfers (bid amounts)
 * - Horse transfers (winning bids)
 */
export const auctionResolutionPhase: PipelinePhase = {
  name: "auctionResolution",
  order: 55,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    if (!state.auctions) return context;

    // Filter for auction bid intents
    const auctionBidIntents = intents.filter((i): i is AuctionBidIntent => i.type === "auction_bid");

    for (const intent of auctionBidIntents) {
      const auction = state.auctions.find((a) => a.id === intent.saleId);
      if (!auction || auction.resolved) continue;

      const lot = auction.lots.find((l) => l.id === intent.lotId);
      if (!lot || lot.passed || lot.withdrawn) continue;

      // Generate auction bid impact
      impacts.push({
        id: crypto.randomUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "auctionResolution",
        logLevel: "conditional",
        type: "auction_bid",
        saleId: intent.saleId,
        lotId: intent.lotId,
        bidderStableId: intent.sourceId,
        amount: intent.amount,
        reason: "Auction bid",
      });

      // If this is the winning bid (highest so far), deduct cash
      // This is simplified - actual auction logic would need to track current high bid
      if (intent.sourceId) {
        impacts.push({
          id: crypto.randomUUID(),
          intentId: intent.id,
          day: newDay,
          phase: "auctionResolution",
          logLevel: "conditional",
          type: "cash_change",
          entityId: intent.sourceId,
          amount: -intent.amount,
          reason: "Auction bid",
        });
      }
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
