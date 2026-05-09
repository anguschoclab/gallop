/**
 * hooks/useMarketState.ts - Market state selectors
 *
 * This file provides Zustand hooks for market state including market data, auctions,
 * and scout reports with shallow comparison for performance.
 *
 * Dependencies: zustand/shallow (shallow), @/game/store (useGame, useGameWithShallow), @/game/types (GameState)
 * Related files: store.ts (state management), auction.ts (uses market state)
 */

import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";

const EMPTY_ARRAY: any[] = [];

/**
 * Market state selectors for trading, auctions, and scouting.
 *
 * @returns Array of market data
 */
export const useMarket = () => useGame((s: GameState) => s.market ?? EMPTY_ARRAY);

/**
 * @returns Array of auctions
 */
export const useAuctions = () => useGameWithShallow((s: GameState) => s.auctions ?? EMPTY_ARRAY);

/**
 * @returns Array of scout reports
 */
export const useScoutReports = () => useGame((s: GameState) => s.scoutReports ?? EMPTY_ARRAY);

/**
 * Multiple market state values with shallow comparison.
 * Use this when you need multiple market state values in a single hook call.
 * Note: Uses type assertion to work around Zustand typing limitation with shallow comparison.
 *
 * @returns Object containing market, auctions, and scoutReports
 */
export const useMarketState = () => {
  const market = useGame((s: GameState) => s.market);
  const auctions = useGame((s: GameState) => s.auctions ?? EMPTY_ARRAY);
  const scoutReports = useGame((s: GameState) => s.scoutReports);

  return {
    market,
    auctions,
    scoutReports,
  };
};
