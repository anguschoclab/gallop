"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultMarketState = createDefaultMarketState;
/**
 * Create default market state for new games.
 *
 * @returns Default market state with empty market, scout reports, private sale offers, and claims
 */
function createDefaultMarketState() {
    return {
        market: [],
        auctions: [],
        scoutReports: [],
        privateSaleOffers: [],
        claims: [],
    };
}
