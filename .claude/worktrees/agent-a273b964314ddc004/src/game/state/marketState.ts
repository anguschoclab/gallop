// Market State - Trading and acquisition systems
// Includes market horses, auctions, and scouting reports

import type { Horse, AuctionSale, ScoutReport } from "../types";

/**
 * Market-related state for trading, auctions, and scouting.
 * Most properties are optional as these systems can be disabled or not yet initialized.
 */
export interface MarketState {
  /** Horses currently available in the market */
  market: Horse[];
  /** Active auction sales (optional - auction system may not be initialized) */
  auctions?: AuctionSale[];
  /** Scouting reports on NPC stables */
  scoutReports: ScoutReport[];
}

/**
 * Default market state for new games
 */
export function createDefaultMarketState(): MarketState {
  return {
    market: [],
    scoutReports: [],
  };
}
