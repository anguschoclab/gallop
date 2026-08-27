/**
 * phases/auctions.ts - Auctions phase
 *
 * This file provides the auctions phase that owns the auction lifecycle:
 * spawns new sales on calendar triggers, resolves sales the player didn't attend,
 * marks sales resolved, and prunes stale sales after 30 days.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (AuctionSale), @/game/auction (generateAuctionLots, SALE_TRIGGERS), @/game/auctionRunner (createAuctionRunner), @/core/calendar/dateFormatting (dayOfYear), @/game/uuid (generateUUID)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import type { AuctionSale } from "@/game/types";
import { generateAuctionLots } from "@/core/auction/engine";
import { SALE_TRIGGERS } from "@/core/auction/data";
import { createAuctionRunner } from "@/core/auction/runner";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { generateUUID } from "@/core/uuid";
import { PHASE_ORDER_AUCTIONS, AUCTION_RETENTION_DAYS } from "@/constants";
import { trackAuctionPrices } from "@/core/ai/economyAITracking";
import { calculateOverallRating } from "@/core/horse/stats";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

/**
 * Phase: Auctions (order 90).
 *
 * Owns the auction lifecycle:
 *   - Spawns new sales on calendar triggers
 *   - Resolves sales the player didn't attend (offline path) by driving the
 *     same `createAuctionRunner` the live Theater uses, then emitting impacts
 *   - Marks sales resolved
 *   - Prunes stale sales after 30 days
 *
 * Per-lot outcomes (cash transfer, horse transfer, lot field updates) are
 * emitted as impacts and committed by `impactApplicationPhase` at order 200.
 * This keeps NPC cash, player cash, and horse ownership all flowing through
 * the same resolver — fixing the long-standing bug where NPC winners didn't
 * pay for the horses they acquired.
 */
export const auctionsPhase = {
  name: "auctions",
  order: PHASE_ORDER_AUCTIONS,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, economicTrend } = context;

    // Use economic trend to adjust auction pricing (yearlingPriceIndex base = 100)
    const priceMultiplier = economicTrend ? economicTrend.yearlingPriceIndex / 100 : 1;

    let auctions: AuctionSale[] = [...(state.auctions ?? [])];
    const logs = [...(context.logs ?? [])];
    const impacts = [...(context.impacts ?? [])];
    const doy = dayOfYear(newDay);

    for (const trigger of SALE_TRIGGERS) {
      const targetDoy = trigger.doy - 14 <= 0 ? trigger.doy - 14 + 365 : trigger.doy - 14;

      if (doy === targetDoy && !auctions.some((a) => !a.resolved && a.kind === trigger.kind)) {
        const saleDay = newDay + 14;
        // generateAuctionLots may push fresh NPC horses into the working
        // horses array (for thin-inventory consignors). We pass a working
        // copy and emit horse-creation impacts for any newcomers.
        const horsesForGen = Object.values(state.horses);
        const beforeCount = horsesForGen.length;
        const newSale = generateAuctionLots(
          saleDay,
          state.npcStables,
          horsesForGen,
          trigger.kind,
          trigger.name,
          context.dailyRng,
        );
        newSale.houseId = trigger.houseId;
        const house = getAuctionHouse(trigger.houseId);
        const housePremium = housePrestigeMultiplier(house);
        const freshHorses = horsesForGen.slice(beforeCount);
        for (const horse of freshHorses) {
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "auctions",
            logLevel: "conditional",
            type: "horse_creation",
            horse,
            reason: "auction_consignment_generation",
          });
        }

        // Take the generated lots and strip them from the sale, because we will emit consignment
        // impacts to add them back in the impact resolution phase (which also locks the horses).
        const generatedLots = newSale.lots;
        newSale.lots = [];
        auctions.push(newSale);
        logs.push({
          day: newDay,
          text: `Catalog opens for ${trigger.name} — sale on Day ${saleDay}.`,
        });

        // Emit consignment impacts for each NPC lot
        for (const lot of generatedLots) {
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "auctions",
            logLevel: "conditional",
            type: "consignment",
            horseId: lot.horseId,
            saleId: newSale.id,
            consignorStableId: lot.consignorStableId,
            reservePrice: Math.round(lot.reservePrice * priceMultiplier),
            breezeSeconds: lot.breezeSeconds,
            reason: "npc_consignment",
          });
        }
      }
    }

    // Resolve sales the player didn't attend. The day-of pipeline runs after
    // the player has had a chance to enter the Theater; sales reached this
    // phase still unresolved on or after their day are processed offline.
    auctions = auctions.map((sale) => {
      if (sale.resolved || sale.day > newDay) return sale;
      // Build a horses snapshot that includes any freshly created consignment
      // horses from earlier this turn (so the runner can find them).
      const horsesIncludingFresh = [
        ...Object.values(state.horses),
        ...(impacts
          .filter((i) => i.type === "horse_creation")
          .map((i) => (i as { horse: unknown }).horse) as never),
      ];
      const runner = createAuctionRunner(sale, state.npcStables, horsesIncludingFresh);
      runner.runToCompletion();
      const finalLots = runner.finalLots();
      const lotImpacts = runner.finalImpacts({ day: newDay, phase: "auctions" });
      for (const impact of lotImpacts) {
        impacts.push(impact);
      }
      for (const line of runner.log()) {
        logs.push({ day: newDay, text: `${sale.name}: ${line}` });
      }
      return { ...sale, lots: finalLots, resolved: true };
    });

    // Track auction prices for economic signal tracking (Phase 5b)
    let updatedNpcAIManager: NpcAIManager | undefined;
    const resolvedSales = auctions.filter((a) => a.resolved);
    if (resolvedSales.length > 0) {
      const auctionResults: Array<{ hammerPrice: number; horseRating: number }> = [];
      for (const sale of resolvedSales) {
        for (const lot of sale.lots) {
          if (lot.hammerPrice && lot.hammerPrice > 0) {
            const horse = state.horses[lot.horseId];
            if (horse) {
              auctionResults.push({
                hammerPrice: lot.hammerPrice,
                horseRating: calculateOverallRating(horse),
              });
            }
          }
        }
      }
      if (auctionResults.length > 0) {
        const aiManager = (state as { npcAIManager?: NpcAIManager }).npcAIManager;
        if (aiManager) {
          updatedNpcAIManager = trackAuctionPrices(aiManager, auctionResults);
        }
      }
    }

    // Prune auctions older than AUCTION_RETENTION_DAYS.
    auctions = auctions.filter((a) => a.day >= newDay - AUCTION_RETENTION_DAYS);

    return {
      ...context,
      state: {
        ...state,
        auctions,
        ...(updatedNpcAIManager ? { npcAIManager: updatedNpcAIManager } : {}),
      },
      impacts,
      logs,
    };
  },
};
