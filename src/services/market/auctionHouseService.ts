/**
 * auctionHouseService.ts - Service facade for auction house desk operations.
 *
 * Wraps core market/prestige functions so components don't import core directly.
 * This reduces component→core layering violations and centralizes the
 * auction house business logic in one service boundary.
 *
 * Dependencies: @/core/market/houseQuotes, @/core/market/exchangeAI,
 *              @/core/prestige/auctionHouses, @/core/horse/ownership,
 *              @/core/common/formatting
 * Related files: src/components/market/AuctionHouseDesk.tsx (consumer)
 */

import { formatCurrency } from "@/core/common/formatting";
import { isPlayerOwned } from "@/core/horse/ownership";
import { createDefaultExchangeState } from "@/core/market/exchange";
import { AUCTION_HOUSES, type AuctionHouse } from "@/core/prestige/auctionHouses";
import { buildHouseCatalogue, houseQuote } from "@/core/market/houseQuotes";
import { sellerStandingBidFactor } from "@/core/market/exchangeAI";
import type { Horse } from "@/game/types";

/** Re-export types and constants for component consumption. */
export type { AuctionHouse };
export { AUCTION_HOUSES, createDefaultExchangeState, formatCurrency, isPlayerOwned };

/**
 * Build a catalogue of available horses for an auction house.
 * @param args - Day, house, and horse list.
 * @param args.day
 * @param args.house
 * @param args.horses
 * @returns The house catalogue.
 */
export function getHouseCatalogue(args: { day: number; house: AuctionHouse; horses: Horse[] }) {
  return buildHouseCatalogue(args);
}

/**
 * Get a sell/buy quote for a horse at a specific auction house.
 * @param horse - The horse to quote.
 * @param allHorses - All horses for market context.
 * @param house - The auction house.
 * @param reputationScore - Player's reputation score.
 * @returns The house quote with sell/buy prices.
 */
export function getHouseQuote(
  horse: Horse,
  allHorses: Horse[],
  house: AuctionHouse,
  reputationScore: number,
) {
  return houseQuote(horse, allHorses, house, reputationScore);
}

/**
 * Get the seller standing bid factor based on reputation.
 * @param reputationScore - Player's reputation score.
 * @returns The standing bid factor.
 */
export function getSellerStandingBidFactor(reputationScore: number) {
  return sellerStandingBidFactor(reputationScore);
}
