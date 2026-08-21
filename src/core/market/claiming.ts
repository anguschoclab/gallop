/**
 * claiming.ts - Claiming race mechanics
 *
 * This file handles claiming transactions, horse transfers, and claiming eligibility
 * for claiming races.
 *
 * Dependencies: ./types (Horse, Race, Claim, ClaimingPrice), @/core/horse/stats (calculateOverallRating), ./rng (createRng, hashStr), @/lib/formatting (formatCurrency)
 * Related files: raceSim.ts (uses claiming mechanics), resolver.ts (handles claiming transactions)
 */

// Claiming Race Mechanics
// Handles claiming transactions, horse transfers, and claiming eligibility

import type { Horse } from "@/core/horse/types";
import type { Race, ClaimingPrice } from "@/core/race/types";
import type { Claim } from "./types";
import { calculateOverallRating } from "@/core/horse/stats";
import { createRng, hashStr, nondeterministicRng, type Rng } from "@/core/common/rng";
import { formatCurrency } from "@/core/common/formatting";

// Horse transfer result from a claiming race
export type HorseTransfer = {
  horseId: string;
  fromStableId: string;
  toStableId: string;
  price: number;
  raceId: string;
  raceName: string;
  day: number;
};

// Claiming attempt result
export type ClaimAttempt = {
  claimantStableId: string;
  horseId: string;
  claimingPrice: number;
  successful: boolean;
  reason?: string;
};

/**
 * Process claims after a race resolves.
 *
 * Returns transfers and logs. If multiple claims for same horse, randomly selects winner.
 *
 * @param race - Race with claiming configuration
 * @param claims - Array of claim attempts
 * @param horses - All horses in the game
 * @param currentDay - Current simulation day
 * @param rng - Optional random number generator
 * @returns Object with transfers array and logs array
 */
export function processClaims(
  race: Race,
  claims: ClaimAttempt[],
  horses: Horse[],
  currentDay: number,
  rng?: Rng,
): { transfers: HorseTransfer[]; logs: string[] } {
  const transfers: HorseTransfer[] = [];
  const logs: string[] = [];

  // Fallback to nondeterministic RNG if none provided
  const _rng = rng || nondeterministicRng();

  if (!race.claimingPrice || race.resolved === false) {
    return { transfers, logs };
  }

  // Group claims by horse
  const claimsByHorse = new Map<string, ClaimAttempt[]>();
  for (const claim of claims) {
    if (!claimsByHorse.has(claim.horseId)) {
      claimsByHorse.set(claim.horseId, []);
    }
    claimsByHorse.get(claim.horseId)!.push(claim);
  }

  // Index horses for O(1) lookup
  const horseMap = new Map(horses.map((h) => [h.id, h]));

  // Process each horse's claims
  for (const [horseId, horseClaims] of claimsByHorse) {
    const horse = horseMap.get(horseId);
    if (!horse || horse.ownership?.type !== "npc") continue;

    if (horseClaims.length === 0) continue;

    // If multiple claims, randomly select winner
    const winningClaimIndex = _rng.int(0, horseClaims.length - 1);
    const winningClaim = horseClaims[winningClaimIndex];

    // Verify claimant has sufficient funds (this is checked elsewhere)
    // Create transfer
    const transfer: HorseTransfer = {
      horseId,
      fromStableId: horse.ownership.stableId,
      toStableId: winningClaim.claimantStableId,
      price: race.claimingPrice,
      raceId: race.id,
      raceName: race.name,
      day: currentDay,
    };

    transfers.push(transfer);
    logs.push(
      `${horse.name} claimed for ${formatCurrency(race.claimingPrice)} by stable ${winningClaim.claimantStableId} after ${race.name}.`,
    );

    // Log other unsuccessful claimants
    for (let i = 0; i < horseClaims.length; i++) {
      if (i !== winningClaimIndex) {
        logs.push(
          `Stable ${horseClaims[i].claimantStableId} failed to claim ${horse.name} (outdrawn).`,
        );
      }
    }
  }

  return { transfers, logs };
}

/**
 * Check if a horse is eligible for a claiming price.
 *
 * Horses should not be significantly over-qualified for the claiming level.
 * Checks value estimation and high-level race wins.
 *
 * @param horse - Horse to check
 * @param claimingPrice - Claiming price to check against
 * @param allHorses - All horses in the game
 * @returns True if horse is eligible for claiming price
 */
export function isHorseEligibleForClaimingPrice(
  horse: Horse,
  claimingPrice: ClaimingPrice,
  allHorses: Horse[],
): boolean {
  // Calculate horse's value based on stats and performance
  const overall = calculateOverallRating(horse);

  // Simple value estimation
  const estimatedValue = overall * 1000;

  // Horse should not be worth significantly more than claiming price
  // Allow some margin (up to 50% over)
  const maxAcceptableValue = claimingPrice * 1.5;

  if (estimatedValue > maxAcceptableValue) {
    return false;
  }

  // Check if horse has won high-level races (graded stakes, etc.)
  const hasHighLevelWin = horse.raceHistory.some(
    (r) => r.position === 1 && (r.grade === "G1" || r.grade === "G2" || r.grade === "G3"),
  );

  if (hasHighLevelWin) {
    return false;
  }

  return true;
}

/**
 * Get suggested claiming price range for a horse.
 *
 * Returns a range of claiming prices based on the horse's overall rating
 * and estimated value.
 *
 * @param horse - Horse to calculate range for
 * @returns Tuple of [minPrice, maxPrice] claiming prices
 */
export function getSuggestedClaimingPriceRange(horse: Horse): [ClaimingPrice, ClaimingPrice] {
  const overall = calculateOverallRating(horse);
  const estimatedValue = overall * 1000;

  const priceTiers: ClaimingPrice[] = [
    5000, 10000, 12500, 16000, 20000, 25000, 32000, 40000, 50000, 62500, 75000, 100000,
  ];

  // Find the closest claiming price tier
  let closestIndex = 0;
  let closestDiff = Math.abs(priceTiers[0] - estimatedValue);

  for (let i = 1; i < priceTiers.length; i++) {
    const diff = Math.abs(priceTiers[i] - estimatedValue);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  // Return a range (current tier and one above/below)
  const minIndex = Math.max(0, closestIndex - 1);
  const maxIndex = Math.min(priceTiers.length - 1, closestIndex + 1);

  return [priceTiers[minIndex], priceTiers[maxIndex]];
}

/**
 * Validate that a claiming race configuration is valid.
 *
 * Checks claiming price range, purse requirements, and optional claiming rules.
 *
 * @param race - Race to validate
 * @returns Object with valid flag and array of issues
 */
export function validateClaimingRace(race: Race): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!race.claimingPrice) {
    issues.push("Claiming race must have a claiming price");
  }

  if (race.claimingPrice && race.claimingPrice < 5000) {
    issues.push("Claiming price must be at least $5,000");
  }

  if (race.claimingPrice && race.claimingPrice > 100000) {
    issues.push("Claiming price cannot exceed $100,000");
  }

  // Claiming races should have reasonable purses
  if (race.claimingPrice && race.purse < race.claimingPrice) {
    issues.push("Purse should be at least equal to claiming price");
  }

  // Optional claiming should have higher purses
  if (race.raceClass === "OptionalClaiming" && race.purse < race.claimingPrice! * 2) {
    issues.push("Optional claiming purse should be at least 2x claiming price");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
