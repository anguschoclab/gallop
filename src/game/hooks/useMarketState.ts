import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";

/**
 * Market state selectors for trading, auctions, and scouting
 */
export const useMarket = () => useGame((s: GameState) => s.market);
export const useAuctions = () => useGameWithShallow((s: GameState) => s.auctions ?? []);
export const useScoutReports = () => useGame((s: GameState) => s.scoutReports);

/**
 * Multiple market state values with shallow comparison
 * Use this when you need multiple market state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation with shallow comparison
 */

export const useMarketState = () =>
  useGameWithShallow((s: GameState) => ({
    market: s.market,
    auctions: s.auctions ?? [],
    scoutReports: s.scoutReports,
  }));
