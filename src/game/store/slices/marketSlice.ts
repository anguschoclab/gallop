/**
 * store/slices/marketSlice.ts - Market state slice
 *
 * This file provides market-related state and actions for direct horse purchasing
 * from the open market.
 *
 * Dependencies: @/game/types (Horse), @/game/state/marketState (MarketState, createDefaultMarketState), @/core/horse/pricing (horsePrice), @/game/uuid (generateUUID), ../types (StoreGet)
 * Related files: store/index.ts (uses this slice)
 */

import type { Horse } from "@/game/types";
import type { MarketState } from "@/game/state/marketState";
import { createDefaultMarketState } from "@/game/state/marketState";
import { horsePrice } from "@/core/horse/pricing";
import { generateUUID } from "@/game/uuid";
import type { StoreGet } from "../types";

export type MarketSlice = MarketState & {
  /**
   * Purchases a horse directly from the open market listing.
   * Checks for sufficient funds before queuing a purchase intent.
   */
  buyHorse: (horseId: string) => void;
  /** Sets the collection of horses currently available on the open market */
  setMarket: (market: Horse[]) => void;
};

export function createMarketSlice(
  set: any,
  get: StoreGet,
  enqueueIntent: (intent: any) => void,
): MarketSlice {
  return {
    ...createDefaultMarketState(),

    buyHorse: (horseId) => {
      const s = get();
      const h = s.market.find((m: Horse) => m.id === horseId);
      if (!h) return;
      const price = horsePrice(h);
      if (s.cash < price) return;

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "purchase",
        horseId,
        price,
      });
    },

    setMarket: (market) => {
      set({ market });
    },
  };
}
