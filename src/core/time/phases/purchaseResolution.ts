/**
 * phases/purchaseResolution.ts - Purchase resolution phase
 *
 * This file provides the purchase resolution phase that converts PurchaseIntents
 * into impacts (horse transfer from market to player).
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/resolver/intents (AnyIntent, PurchaseIntent), @/core/resolver/impacts/index (AnyImpact, HorseTransferImpact), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

// Purchase Resolution Phase
// Converts PurchaseIntents into impacts (horse transfer from market to player)

import { PHASE_ORDER_PURCHASE_RESOLUTION } from "@/constants";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyIntent, PurchaseIntent } from "@/core/resolver/intents";
import type { AnyImpact, HorseTransferImpact } from "@/core/resolver/impacts/index";
import { generateUUID } from "@/core/uuid";

/**
 * Purchase Resolution Phase (Order 35)
 * Resolves PurchaseIntents into impacts:
 * - Horse transfer from market to player
 * - Cash already deducted when intent was enqueued
 */
export const purchaseResolutionPhase: PipelinePhase = {
  name: "purchaseResolution",
  order: PHASE_ORDER_PURCHASE_RESOLUTION,
  execute: (context: PipelineContext): PipelineContext => {
    const { intents, state, newDay } = context;
    const impacts: AnyImpact[] = [];

    // Filter for purchase intents
    const purchaseIntents = intents.filter((i): i is PurchaseIntent => i.type === "purchase");

    const marketMap = new Map(state.market.map((h) => [h.id, h]));

    for (const intent of purchaseIntents) {
      const horse = marketMap.get(intent.horseId);
      if (!horse) continue;

      // Generate horse transfer impact
      impacts.push({
        id: generateUUID(),
        intentId: intent.id,
        day: newDay,
        phase: "purchaseResolution",
        logLevel: "always",
        type: "horse_transfer",
        horseId: intent.horseId,
        fromStableId: undefined, // Market horses have no stable
        toStableId: undefined, // Player-owned horses have no stableId
        price: intent.price,
        reason: "Purchase from market",
      });
    }

    // Remove purchased horses from market
    const purchasedHorseIds = new Set(purchaseIntents.map((i) => i.horseId));
    const newMarket = state.market.filter((h) => !purchasedHorseIds.has(h.id));

    return {
      ...context,
      impacts: [...context.impacts, ...impacts],
      state: {
        ...state,
        market: newMarket,
      },
    };
  },
};
