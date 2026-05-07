import type { PipelineContext } from "../pipeline";
import { refreshMarket } from "@/game/store/helpers/market";
import { createRng, hashStr } from "@/game/rng";
import {
  shouldPurchaseHorse,
  calculateMaxPurchasePrice,
  createMarketAIState,
  recordMarketPurchase,
} from "@/core/ai/marketAI";
import { getOrCreateStableAIState } from "@/core/ai/npcCycleAI";

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
          const horseRating =
            (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration) / 3;
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

    return {
      ...context,
      state: {
        ...state,
        market,
        npcStables,
        npcAIManager,
      },
    };
  },
};
