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

import type { Horse } from "@/domains/horse/simulation/types";
import type { AuctionSale, ScoutReport, PrivateSaleOffer, Claim } from "@/domains/market/model/types";
import type { ExchangeState } from "@/domains/market/simulation/exchange";
import { createDefaultExchangeState } from "@/domains/market/simulation/exchange";
import type { ScoutingAssignment } from "@/domains/agents/model/scoutingThresholds";
import type { PlayerBiddingRecord } from "@/domains/auction/simulation/biddingHistory";
import type { PriceAlert } from "@/domains/market/simulation/priceAlerts";
import type { MarketStrategy } from "@/domains/market/simulation/strategy";
import { DEFAULT_MARKET_STRATEGY } from "@/domains/market/simulation/strategy";

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
  /** Standing scouting assignments that run automatically each day */
  scoutingAssignments: ScoutingAssignment[];
  /** Private sale offers between player and NPC stables */
  privateSaleOffers: PrivateSaleOffer[];
  /** Claims filed against horses in claiming races */
  claims: Claim[];
  /** Bloodstock exchange order book: asks, bids and completed trades */
  exchange: ExchangeState;
  /** Every auction lot the player bid on, with bids and final hammer price */
  playerBiddingHistory: PlayerBiddingRecord[];
  /** Whether top stallions are syndicated automatically each day */
  autoSyndicateEnabled: boolean;
  /** Player-configured market price alerts */
  priceAlerts: PriceAlert[];
  /** Trade-notification keys already pushed to the inbox (de-duplication) */
  notifiedTradeKeys: string[];
  /** Player's market buying-strategy settings (grades, prestige, price, stake) */
  marketStrategy: MarketStrategy;
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
    scoutingAssignments: [],
    privateSaleOffers: [],
    claims: [],
    exchange: createDefaultExchangeState(),
    playerBiddingHistory: [],
    autoSyndicateEnabled: false,
    priceAlerts: [],
    notifiedTradeKeys: [],
    marketStrategy: { ...DEFAULT_MARKET_STRATEGY },
  };
}
