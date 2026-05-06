import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store/index";
import type { GameState } from "@/game/types";

/**
 * Market state selectors for trading, auctions, and scouting
 */
export const useMarket = () => useGame((s: GameState) => s.market);
export const useAuctions = () => (useGame as any)((s: GameState) => s.auctions ?? [], shallow);
export const useScoutReports = () => useGame((s: GameState) => s.scoutReports);

/**
 * Multiple market state values with shallow comparison
 * Use this when you need multiple market state values in a single hook call
 * Note: Uses type assertion to work around Zustand typing limitation
 */
export const useMarketState = () =>
  (useGame as any)(
    (s: GameState) => ({
      market: s.market,
      auctions: s.auctions ?? [],
      scoutReports: s.scoutReports,
    }),
    shallow,
  );
