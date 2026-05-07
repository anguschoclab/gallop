import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { ConsignmentIntent } from "@/core/resolver/intents";
import type { AnyImpact } from "@/core/resolver/impacts";
import { generateUUID } from "@/game/uuid";

/**
 * Consignment Resolution Phase (Order 16)
 * Converts player ConsignmentIntents into impacts.
 */
export const consignmentResolutionPhase: PipelinePhase = {
  name: "consignmentResolution",
  order: 16,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    const consignmentIntents = intents.filter(
      (i): i is ConsignmentIntent => i.type === "consignment",
    );

    for (const intent of consignmentIntents) {
      const horse = state.horses.find((h) => h.id === intent.horseId);
      const auction = state.auctions?.find((a) => a.id === intent.saleId);

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

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
