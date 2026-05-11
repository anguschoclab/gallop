/**
 * phases/market.ts - Market refresh phase
 *
 * This file provides the market refresh phase that refreshes the horse market
 * and handles NPC AI-driven purchases.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/store/helpers/market (refreshMarket), @/game/rng (createRng, hashStr), @/core/ai/marketAI (shouldPurchaseHorse, calculateMaxPurchasePrice, createMarketAIState, recordMarketPurchase), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/core/staff/staffGenerator (generateStaffPool)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import { refreshMarket } from "@/game/store/helpers/market";
import { calculateRaceRating } from "@/core/horse/stats";
import { createRng, hashStr } from "@/game/rng";
import {
  shouldPurchaseHorse,
  calculateMaxPurchasePrice,
  createMarketAIState,
  recordMarketPurchase,
} from "@/core/ai/marketAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";
import { generateStaffPool } from "@/core/staff/staffGenerator";

/**
 * Phase: Market Refresh
 * Refresh the horse market and handle NPC AI-driven purchases
 */
export const marketPhase = {
  name: "market",
  order: 50,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, dailyRng, newDay } = context;
    let market = refreshMarket(state.market, dailyRng);
    const npcStables = state.npcStables;
    const npcAIManager = state.npcAIManager;

    // NPC AI-driven market purchases
    if (npcAIManager && npcStables.length > 0) {
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

            if (estimatedPrice <= maxPrice && stable.cash >= estimatedPrice) {
              // Purchase the horse
              stable.cash -= estimatedPrice;
              const purchasedHorse = { ...horse, stableId: stable.id };
              state.horses.push(purchasedHorse);

              // Remove horse from market
              market = market.filter((h) => h.id !== horse.id);

              // Record purchase for AI learning
              recordMarketPurchase(aiState.marketAI, horse, estimatedPrice, stable, newDay);

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

    return {
      ...context,
      state: {
        ...state,
        market,
        npcStables,
        npcAIManager,
        staffPool,
      },
    };
  },
};
