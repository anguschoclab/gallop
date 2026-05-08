// Claiming Race Mechanics
// Handles claiming transactions, horse transfers, and claiming eligibility

import type { Horse, Race, Claim, ClaimingPrice } from "./types";
import { calculateOverallRating } from "@/core/horse/stats";
import { createRng, hashStr } from "./rng";
import { formatCurrency } from "@/components/HorseBits";

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

// Process claims after a race resolves
// Returns transfers and logs
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
  const _rng = rng || {
    next: () => Math.random(),
    int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    range: (min: number, max: number) => min + Math.random() * (max - min),
    pick: <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)],
    gauss: (mean = 0, sd = 1) =>
      mean + sd * (Math.random() + Math.random() + Math.random() + Math.random() - 2), // Rough approximation
  };

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

  // Process each horse's claims
  for (const [horseId, horseClaims] of claimsByHorse) {
    const horse = horses.find((h) => h.id === horseId);
    if (!horse || !horse.stableId) continue;

    if (horseClaims.length === 0) continue;

    // If multiple claims, randomly select winner
    const winningClaimIndex = _rng.int(0, horseClaims.length - 1);
    const winningClaim = horseClaims[winningClaimIndex];

    // Verify claimant has sufficient funds (this is checked elsewhere)
    // Create transfer
    const transfer: HorseTransfer = {
      horseId,
      fromStableId: horse.stableId,
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

// Check if a horse is eligible for a claiming price
// Horses should not be significantly over-qualified for the claiming level
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

// Get suggested claiming price range for a horse
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

// Validate that a claiming race configuration is valid
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
