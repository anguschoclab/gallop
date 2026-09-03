/**
 * state/marketState.ts - Market state management
 *
 * This file provides market-related state for trading, auctions, and scouting,
 * including market horses, auction sales, scouting reports, private sale offers,
 * and claims filed against horses in claiming races.
 *
 * Dependencies: ../types (Horse, AuctionSale, ScoutReport, PrivateSaleOffer, Claim)
 * Related files: store.ts (uses market state), market.ts (market logic), auction.ts (auction logic)
 */

// Market State - Trading and acquisition systems
// Includes market horses, auctions, and scouting reports

import type { Horse } from "@/core/horse/types";
import type { AuctionSale, ScoutReport, PrivateSaleOffer, Claim } from "@/core/market/types";
import type { ExchangeState } from "@/core/market/exchange";
import { createDefaultExchangeState } from "@/core/market/exchange";

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
  /** Private sale offers between player and NPC stables */
  privateSaleOffers: PrivateSaleOffer[];
  /** Claims filed against horses in claiming races */
  claims: Claim[];
  /** Bloodstock exchange order book: asks, bids and completed trades */
  exchange: ExchangeState;
}

/**
 * Create default market state for new games.
 *
 * @returns Default market state with empty market, scout reports, private sale offers, and claims
 */
export function createDefaultMarketState(): MarketState {
  return {
    market: [],
    auctions: [],
    scoutReports: [],
    privateSaleOffers: [],
    claims: [],
    exchange: createDefaultExchangeState(),
  };
}
