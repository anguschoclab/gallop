/**
 * phases/consignmentResolution.ts - Consignment resolution phase
 *
 * This file provides the consignment resolution phase that converts player
 * ConsignmentIntents into impacts.
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/impacts/index (AnyImpact), @/game/uuid (generateUUID), @/core/resolver/intents (ConsignmentIntent, ConsignmentWithdrawalIntent)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_CONSIGNMENT_RESOLUTION } from "@/platform/time/pipelineConstants";
import type { PipelineContext, PipelinePhase } from "@/platform/time/pipeline";
import type { AnyImpact } from "@/platform/resolver/impacts";
import { generateUUID } from "@/shared/uuid/uuid";
import { asStableId } from "@/shared/types/branded";
import type { ConsignmentIntent, ConsignmentWithdrawalIntent } from "@/platform/resolver/intents";

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

    // A horse can be catalogued in one sale at a time — including sales it
    // was entered into earlier in this same phase.
    const consignedThisPhase = new Set<string>();

    for (const intent of consignmentIntents) {
      const horse = horseMap.get(intent.horseId);
      const auction = auctionMap.get(intent.saleId);

      if (!horse || !auction) continue;
      if (auction.resolved) continue;
      if (horse.consignedSaleId) continue;
      if (consignedThisPhase.has(intent.horseId)) continue;

      // Rival-stable consignments must name their stable as consignor; a lot
      // with no consignor is the player's, so its sale money would go to the player.
      const npcConsignor =
        intent.source === "npc" && intent.sourceId ? asStableId(intent.sourceId) : undefined;
      if (
        npcConsignor &&
        (horse.ownership?.type !== "npc" || String(horse.ownership.stableId) !== intent.sourceId)
      ) {
        continue;
      }
      consignedThisPhase.add(intent.horseId);

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
        consignorStableId: npcConsignor,
        reason: npcConsignor ? "npc_consignment" : "Player consignment",
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
