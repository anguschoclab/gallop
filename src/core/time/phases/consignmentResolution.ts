/**
 * phases/consignmentResolution.ts - Consignment resolution phase
 *
 * This file provides the consignment resolution phase that converts player
 * ConsignmentIntents into impacts.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/impacts/index (AnyImpact), @/game/uuid (generateUUID), @/core/resolver/intents (ConsignmentIntent, ConsignmentWithdrawalIntent)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_CONSIGNMENT_RESOLUTION } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";
import type { ConsignmentIntent, ConsignmentWithdrawalIntent } from "@/core/resolver/intents";

/**
 * Consignment Resolution Phase (Order 16)
 * Converts player ConsignmentIntents into impacts.
 */
export const consignmentResolutionPhase: PipelinePhase = {
  name: "consignmentResolution",
  order: PHASE_ORDER_CONSIGNMENT_RESOLUTION,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    const consignmentIntents = intents.filter(
      (i): i is ConsignmentIntent => i.type === "consignment",
    );

    const withdrawalIntents = intents.filter(
      (i): i is ConsignmentWithdrawalIntent => i.type === "consignment_withdrawal",
    );

    const { horseMap } = context;
    const auctionMap = new Map((state.auctions ?? []).map((a) => [a.id, a]));

    for (const intent of consignmentIntents) {
      const horse = horseMap.get(intent.horseId);
      const auction = auctionMap.get(intent.saleId);

      if (!horse || !auction) continue;
      if (auction.resolved) continue;
      if (horse.consignedSaleId) continue;

      impacts.push({
        id: generateUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "consignmentResolution",
        logLevel: "always",
        type: "consignment",
        horseId: intent.horseId,
        saleId: intent.saleId,
        reservePrice: intent.reservePrice,
        reason: "Player consignment",
      });
    }

    for (const intent of withdrawalIntents) {
      const horse = horseMap.get(intent.horseId);
      const auction = auctionMap.get(intent.saleId);

      if (!horse || !auction) continue;
      if (auction.resolved) continue;
      if (horse.consignedSaleId !== intent.saleId) continue;

      impacts.push({
        id: generateUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "consignmentResolution",
        logLevel: "always",
        type: "consignment_withdrawal",
        horseId: intent.horseId,
        saleId: intent.saleId,
        reason: "Player withdrawal",
      });
    }

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
