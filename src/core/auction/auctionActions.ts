/**
 * auctionActions.ts — Pure helpers for auction slice validation and record building.
 * Extracted from auctionSlice.ts per PR 7 of the megaplan.
 *
 * Dependencies: @/game/types (Horse, AuctionSale, AuctionLot),
 *              @/core/horse/pricing, @/core/horse/ownership, @/constants
 */

import type { Horse, AuctionSale, AuctionLot } from "@/game/types";
import { horseMarketValue } from "@/core/horse/pricing";
import { DEFAULT_PLAYER_RESERVE_RATIO } from "@/constants";

export interface ConsignmentValidationInput {
  horse: Horse | undefined;
  sale: AuctionSale | undefined;
  allHorses: Horse[];
  reservePrice?: number;
}

export interface ConsignmentValidationResult {
  ok: boolean;
  reason?: string;
  reservePrice?: number;
}

/**
 * Validate a consignment attempt and compute the reserve price.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Consignment validation inputs
 * @returns Validation result with computed reserve price if valid
 */
export function validateConsignment(
  input: ConsignmentValidationInput,
): ConsignmentValidationResult {
  const { horse, sale, allHorses, reservePrice } = input;

  if (!horse) return { ok: false, reason: "Horse not found." };
  if (horse.consignedSaleId) return { ok: false, reason: "Already consigned to a sale." };
  if (!sale) return { ok: false, reason: "Sale not found." };
  if (sale.resolved) return { ok: false, reason: "Sale already resolved." };

  const baseValue = horseMarketValue(horse, allHorses);
  const finalReserve = Math.round(reservePrice ?? baseValue * DEFAULT_PLAYER_RESERVE_RATIO);

  return { ok: true, reservePrice: finalReserve };
}

export interface WithdrawalValidationInput {
  horse: Horse | undefined;
  sale: AuctionSale | undefined;
}

export interface WithdrawalValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate a consignment withdrawal attempt.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Withdrawal validation inputs
 * @returns Validation result
 */
export function validateWithdrawal(input: WithdrawalValidationInput): WithdrawalValidationResult {
  const { horse, sale } = input;

  if (!horse) return { ok: false, reason: "Horse not found." };
  if (!horse.consignedSaleId) return { ok: false, reason: "Horse not consigned." };
  if (!sale) return { ok: false, reason: "Sale not found." };
  if (sale.resolved) return { ok: false, reason: "Sale already resolved." };

  return { ok: true };
}

export interface BookBidValidationInput {
  sale: AuctionSale | undefined;
  lot: AuctionLot | undefined;
  cash: number;
  amount: number;
}

export interface BookBidValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate a book bid attempt.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Book bid validation inputs
 * @returns Validation result
 */
export function validateBookBid(input: BookBidValidationInput): BookBidValidationResult {
  const { sale, lot, cash, amount } = input;

  if (!sale) return { ok: false, reason: "Sale not found." };
  if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
  if (!lot) return { ok: false, reason: "Lot not found." };
  if (lot.withdrawn || lot.passed) return { ok: false, reason: "Lot not available." };
  if (cash < amount) return { ok: false, reason: "Insufficient funds." };

  return { ok: true };
}

export interface BuyNowValidationInput {
  sale: AuctionSale | undefined;
  lot: AuctionLot | undefined;
  cash: number;
}

export interface BuyNowValidationResult {
  ok: boolean;
  reason?: string;
  buyNowPrice?: number;
}

/**
 * Validate a buy-now attempt.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Buy-now validation inputs
 * @returns Validation result with buy-now price if valid
 */
export function validateBuyNow(input: BuyNowValidationInput): BuyNowValidationResult {
  const { sale, lot, cash } = input;

  if (!sale) return { ok: false, reason: "sale_not_found" };
  if (sale.resolved) return { ok: false, reason: "sale_resolved" };
  if (sale.kind === "broodmare") return { ok: false, reason: "buy_now_unavailable" };
  if (!lot) return { ok: false, reason: "lot_not_found" };
  if (lot.buyNowPrice === undefined) return { ok: false, reason: "buy_now_unavailable" };
  const buyNowPrice: number = lot.buyNowPrice;
  if (cash < buyNowPrice) return { ok: false, reason: "insufficient_funds" };
  if (lot.withdrawn || lot.passed || lot.hammerPrice !== undefined)
    return { ok: false, reason: "lot_not_available" };

  return { ok: true, buyNowPrice };
}

/**
 * Build the log text for a book bid.
 * Pure: returns a string.
 *
 * @param amount - The bid amount
 * @param lotId - The lot ID
 * @param saleName - The sale name
 * @returns Log entry text
 */
export function buildBookBidLogText(amount: number, lotId: string, saleName: string): string {
  return `Book bid of $${amount.toLocaleString()} placed on lot ${lotId} in ${saleName}.`;
}

/**
 * Build the log text for an auction resolution.
 * Pure: returns a string.
 *
 * @param saleName - The sale name
 * @returns Log entry text
 */
export function buildAuctionResolutionLogText(saleName: string): string {
  return `Auction ${saleName} resolved.`;
}
