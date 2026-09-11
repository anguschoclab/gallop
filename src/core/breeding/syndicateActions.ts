/**
 * syndicateActions.ts — Pure helpers for syndicate validation and computation.
 * Extracted from syndicateActions.ts slice per PR 7 of the megaplan.
 *
 * Dependencies: @/game/types (Horse), @/core/horse/ownership,
 *              @/core/breeding/devolutionUtils, @/core/breeding/investorTypes
 */

import type { Horse } from "@/game/types";
import { getStableId } from "@/core/horse/ownership";

export interface SyndicateCreationValidationInput {
  stallion: Horse | undefined;
  existingSyndicate: unknown;
}

export interface SyndicateCreationValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate a syndicate creation attempt.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Validation inputs
 * @returns Validation result
 */
export function validateSyndicateCreation(
  input: SyndicateCreationValidationInput,
): SyndicateCreationValidationResult {
  const { stallion, existingSyndicate } = input;

  if (!stallion) return { ok: false, reason: "Stallion not found." };
  const g1Wins =
    stallion.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length || 0;
  if (g1Wins === 0) return { ok: false, reason: "Stallion must be a G1 winner to syndicate." };
  if (existingSyndicate) return { ok: false, reason: "Stallion is already syndicated." };

  return { ok: true };
}

export interface SharePurchaseValidationInput {
  syndicateExists: boolean;
  cash: number;
  shares: number;
  pricePerShare: number;
}

export interface SharePurchaseValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate a share purchase attempt.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Validation inputs
 * @returns Validation result
 */
export function validateSharePurchase(
  input: SharePurchaseValidationInput,
): SharePurchaseValidationResult {
  const { syndicateExists, cash, shares, pricePerShare } = input;

  if (!syndicateExists) return { ok: false, reason: "Syndicate not found." };
  const totalCost = shares * pricePerShare;
  if (cash < totalCost) return { ok: false, reason: "Insufficient cash to purchase shares." };

  return { ok: true };
}

export interface ShareSaleValidationInput {
  syndicateExists: boolean;
  playerShares: number;
  shares: number;
}

export interface ShareSaleValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate a share sale attempt.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Validation inputs
 * @returns Validation result
 */
export function validateShareSale(input: ShareSaleValidationInput): ShareSaleValidationResult {
  const { syndicateExists, playerShares, shares } = input;

  if (!syndicateExists) return { ok: false, reason: "Syndicate not found." };
  if (playerShares < shares) return { ok: false, reason: "You don't own enough shares." };

  return { ok: true };
}

export interface BuyoutComputationInput {
  sharePrice: number;
  investorShares: number;
  investorSatisfaction: number;
}

export interface BuyoutComputationResult {
  price: number;
}

/**
 * Compute the buyout price for an investor's shares.
 * Pure: returns a result object, does not mutate state.
 *
 * @param input - Buyout computation inputs
 * @returns Buyout price
 */
export function computeBuyoutPrice(input: BuyoutComputationInput): BuyoutComputationResult {
  const { sharePrice, investorShares, investorSatisfaction } = input;
  const satisfactionFactor = 0.8 + investorSatisfaction / 100;
  const price = Math.round(sharePrice * investorShares * satisfactionFactor);
  return { price };
}

/**
 * Build the log text for an investor buyout.
 * Pure: returns a string.
 *
 * @param investorName - The investor's name
 * @param price - The buyout price
 * @param shares - The number of shares
 * @returns Log entry text
 */
export function buildBuyoutLogText(investorName: string, price: number, shares: number): string {
  return `Bought out ${investorName} for $${price.toLocaleString()} (${shares} shares).`;
}

/**
 * Build the log text for a devolution event.
 * Pure: returns a string.
 *
 * @param stallionName - The stallion's name
 * @param newOwner - The new owner key
 * @returns Log entry text
 */
export function buildDevolutionLogText(stallionName: string, newOwner: string): string {
  return `Syndicate: ${stallionName} ownership transferred to ${newOwner === "player" ? "your stable" : newOwner} (majority shareholder).`;
}
