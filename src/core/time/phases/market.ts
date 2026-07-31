/**
 * phases/market.ts - Market refresh phase
 *
 * This file provides the market refresh phase that refreshes the horse market
 * and handles NPC AI-driven purchases.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/store/helpers/market (refreshMarket), @/game/rng (createRng, hashStr), @/core/ai/marketAI (shouldPurchaseHorse, calculateMaxPurchasePrice, createMarketAIState, recordMarketPurchase), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/core/staff/staffGenerator (generateStaffPool)
 * Related files: ../pipeline.ts (uses phase)
 */

import { PHASE_ORDER_MARKET } from "@/constants";
import type { PipelineContext } from "../pipeline";
import { refreshMarket } from "@/game/store/helpers/market";
import { calculateRaceRating } from "@/core/horse/stats";
import { createRng, hashStr } from "@/core/common/rng";
import {
  shouldPurchaseHorse,
  calculateMaxPurchasePrice,
  createMarketAIState,
  recordMarketPurchase,
} from "@/core/ai/marketAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { trackMarketPrices } from "@/core/ai/economyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { generateStaffPool } from "@/core/staff/staffGenerator";
import { generateUUID } from "@/core/uuid";
import type { AnyImpact } from "@/core/resolver/impacts/index";

/**
 * Phase: Market Refresh
 * Refresh the horse market and handle NPC AI-driven purchases
 */
export const marketPhase = {
  name: "market",
  order: PHASE_ORDER_MARKET,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, dailyRng, newDay } = context;
    let market = refreshMarket(state.market, dailyRng);
    const npcStables = state.npcStables;
    let npcAIManager = state.npcAIManager;
    const impacts: AnyImpact[] = [];

    // NPC AI-driven market purchases
    if (npcAIManager && npcStables.length > 0) {
      // Clone the manager and stable map so we never mutate the original state.
      npcAIManager = {
        ...npcAIManager,
        stableStates: Object.fromEntries(
          Object.entries(npcAIManager.stableStates).map(([id, s]) => [id, { ...s }]),
        ),
      };
      const stableCashUpdates = new Map<string, number>();

      for (const stable of npcStables) {
        const aiState = getOrCreateStableAIState(npcAIManager, stable, newDay);
        if (!aiState.marketAI) {
          aiState.marketAI = createMarketAIState(stable);
        }

        // Check if stable should purchase any horse from market
        for (const horse of market) {
          // Estimate price based on horse stats (since Horse doesn't have price field)
          const horseRating = calculateRaceRating(horse);
          const estimatedPrice = Math.floor(horseRating * 1000);

          const shouldPurchase = shouldPurchaseHorse(
            aiState.marketAI,
            horse,
            estimatedPrice,
            stable,
            newDay,
          );
          if (shouldPurchase) {
            const maxPrice = calculateMaxPurchasePrice(aiState.marketAI, horse, stable);

            const currentCash = stableCashUpdates.get(stable.id) ?? stable.cash;
            if (estimatedPrice <= maxPrice && currentCash >= estimatedPrice) {
              // Track cash update locally; impact resolver will commit it.
              stableCashUpdates.set(stable.id, currentCash - estimatedPrice);

              impacts.push({
                id: generateUUID(dailyRng),
                intentId: "",
                day: newDay,
                phase: "market",
                logLevel: "conditional",
                type: "horse_transfer",
                horseId: horse.id,
                fromStableId: undefined,
                toStableId: stable.id,
                price: estimatedPrice,
                reason: `NPC stable ${stable.name} purchased ${horse.name} from market`,
              });
              impacts.push({
                id: generateUUID(dailyRng),
                intentId: "",
                day: newDay,
                phase: "market",
                logLevel: "conditional",
                type: "cash_change",
                entityId: stable.id,
                amount: -estimatedPrice,
                reason: `Market purchase of ${horse.name}`,
              });

              // Remove horse from market
              market = market.filter((h) => h.id !== horse.id);

              // Record purchase for AI learning
              recordMarketPurchase(aiState.marketAI, horse, estimatedPrice, stable, newDay);
              npcAIManager.stableStates[stable.id] = aiState;

              // Only purchase one horse per stable per day
              break;
            }
          }
        }
      }
    }

    // Staff pool replenishment
    let staffPool = state.staffPool ?? [];
    if (staffPool.length < 4) {
      const newStaff = generateStaffPool(dailyRng, 6 - staffPool.length);
      staffPool = [...staffPool, ...newStaff];
    }

    // Track market purchase prices for economic signals (Phase 5b)
    const marketPurchases = impacts
      .filter((imp) => imp.type === "horse_transfer" && imp.price !== undefined)
      .map((imp) => {
        const horse = context.horseMap.get((imp as { horseId: string }).horseId);
        return {
          price: (imp as { price: number }).price,
          horseRating: horse ? calculateRaceRating(horse) : 50,
        };
      });
    if (marketPurchases.length > 0 && npcAIManager) {
      npcAIManager = trackMarketPrices(npcAIManager as NpcAIManager, marketPurchases);
    }

    return {
      ...context,
      state: {
        ...state,
        market,
        npcStables,
        npcAIManager,
        staffPool,
      },
      impacts: [...context.impacts, ...impacts],
    };
  },
};
