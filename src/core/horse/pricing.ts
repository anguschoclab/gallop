/**
 * pricing.ts - Horse valuation and pricing
 *
 * Provides functions for valuing horses through the full lifecycle: pre-career
 * (yearling projection from pedigree + potential), current market value
 * (racing form + partial breeding upside), and post-career residual (breeding
 * value once retired). Breeding value factors gender, stud fee capitalization
 * for stallions, and blue-hen / production record for mares.
 *
 * Dependencies: @/game/types (Horse, StableTier, GameState, Stable), ./stats (calculateOverallRating), ../breeding/pedigreePricing (pedigreeMultiplier)
 * Related files: stallions.ts (uses for stud fee calculation), market.ts (uses for horse pricing), auction (ConsignDialog / auctionSlice)
 */

import type { Horse, StableTier, Stable } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import {
  AGE_YOUNG_THRESHOLD,
  AGE_OLD_THRESHOLD,
  AGE_RETIREMENT_THRESHOLD,
  INJURY_PRONENESS_LOW_THRESHOLD,
  INJURY_PRONENESS_HIGH_THRESHOLD,
  FAN_VALUATION_DIVISOR,
  FAN_BREEDING_VALUATION_DIVISOR,
} from "@/constants";

/**
 * Canonical base valuation formula shared by horsePrice() and stallions.valueOf().
 * @param horse
 * @param tier
 */
export function calculateBaseHorseValue(horse: Horse, tier: StableTier): number {
  const overall = calculateOverallRating(horse);
  const ageMod =
    horse.age <= AGE_YOUNG_THRESHOLD ? 1.3 : horse.age >= AGE_OLD_THRESHOLD ? 0.5 : 0.9;
  const fameMod = 1 + horse.fame / 200;
  const fanMod = 1 + (horse.fanCount ?? 0) / FAN_VALUATION_DIVISOR;
  const tierMod = tier === "elite" ? 1.5 : tier === "mid" ? 1.2 : 1.0;
  return Math.round((overall * 100 * ageMod * fameMod * fanMod * tierMod) / 100) * 100;
}

/**
 * NPC Stable valuation alias.
 * @param horse
 * @param tier
 */
export function calculateNpcHorseValue(horse: Horse, tier: StableTier): number {
  return calculateBaseHorseValue(horse, tier);
}

/**
 * Get stud fee for a horse based on its value.
 * @param horse
 * @param stable
 */
export function getStudFee(horse: Horse, stable: Pick<Stable, "tier">): number {
  if (horse.gender !== "horse" && horse.gender !== "colt") return 0;
  if (horse.age < 4) return 0;
  return calculateNpcHorseValue(horse, stable.tier);
}

/**
 * Get broodmare fee for a horse based on its value.
 * @param horse
 * @param stable
 */
export function getBroodmareFee(horse: Horse, stable: Pick<Stable, "tier">): number {
  if (horse.gender !== "mare" && horse.gender !== "filly") return 0;
  if (horse.age < 3) return 0;
  return Math.round(calculateNpcHorseValue(horse, stable.tier) * 0.3);
}

/**
 * Market price for a player-owned horse (racing-based, no tier context needed).
 * Kept backward compatible – reflects racing form and biological quality only.
 * @param h
 */
export function horsePrice(h: Horse): number {
  const overall = calculateOverallRating(h);
  const ageMod = h.age <= AGE_YOUNG_THRESHOLD ? 1.2 : h.age >= AGE_RETIREMENT_THRESHOLD ? 0.7 : 1;
  const potMod = 0.5 + h.potential / 100;

  let bioMod = 1.0;
  const conformationVal = h.stats?.conformation ?? h.conformation ?? 50;
  const temperamentVal = h.stats?.temperament ?? h.temperament ?? 50;
  if (conformationVal >= 90) bioMod += 0.05;
  if (temperamentVal >= 90) bioMod += 0.05;
  if (conformationVal <= 30) bioMod -= 0.1;
  if (temperamentVal <= 30) bioMod -= 0.1;

  const proneness = h.injuryProneness ?? 0.05;
  if (proneness < INJURY_PRONENESS_LOW_THRESHOLD) bioMod += 0.15;
  if (proneness > INJURY_PRONENESS_HIGH_THRESHOLD) bioMod -= 0.2;

  const fanMod = 1 + (h.fanCount ?? 0) / FAN_VALUATION_DIVISOR;
  return Math.round((overall * 80 * ageMod * potMod * bioMod * fanMod) / 50) * 50;
}

/**
 * Pedigree-aware racing market price.
 * Backward-compatible: without a pedigree context, returns horsePrice(h).
 * @param h
 * @param allHorses
 */
export function horsePriceWithPedigree(h: Horse, allHorses: Horse[]): number {
  const base = horsePrice(h);
  return (
    Math.round(
      (base *
        pedigreeMultiplier(h, { horses: Object.fromEntries(allHorses.map((h) => [h.id, h])) })) /
        50,
    ) * 50
  );
}

// -----------------------------------------------------------------------------
// Breeding value & full-career valuation
// -----------------------------------------------------------------------------

/** Reproductive prime window for stallions (years). */
const STALLION_PRIME_START = 4;
const STALLION_PRIME_END = 18;
/** Reproductive prime window for mares (years). */
const MARE_PRIME_START = 3;
const MARE_PRIME_END = 16;

function stallionAgeCurve(age: number): number {
  if (age < STALLION_PRIME_START) return 0.3 + 0.15 * Math.max(0, age - 1);
  if (age <= STALLION_PRIME_END) return 1.0;
  return Math.max(0.15, 1 - (age - STALLION_PRIME_END) * 0.15);
}

function mareAgeCurve(age: number): number {
  if (age < MARE_PRIME_START) return 0.4 + 0.2 * Math.max(0, age - 1);
  if (age <= MARE_PRIME_END) return 1.0;
  return Math.max(0.1, 1 - (age - MARE_PRIME_END) * 0.2);
}

/**
 * Estimate a horse's breeding-market value.
 *
 * Geldings return 0. Stallions capitalize their stud fee (fee × book × fill × discounted years)
 * when at stud; otherwise a projected value is derived from racing accomplishments, pedigree,
 * and potential. Mares blend production record (blue-hen score, stakes/G1 winners, foals),
 * fertility, and pedigree.
 * @param h
 * @param allHorses
 */
export function estimateBreedingValue(h: Horse, allHorses: Horse[] = []): number {
  if (h.gender === "gelding" || h.gelded) return 0;

  const overall = calculateOverallRating(h);
  const potMod = 0.5 + (h.potential ?? 50) / 100;
  const pedMul = pedigreeMultiplier(h, {
    horses: Object.fromEntries(allHorses.map((h) => [h.id, h])),
  });
  const winRate = h.careerStarts > 0 ? h.careerWins / h.careerStarts : 0;
  const fameBoost = 1 + (h.fame ?? 0) / 150;
  const fanBoost = 1 + (h.fanCount ?? 0) / FAN_BREEDING_VALUATION_DIVISOR;

  const male = h.gender === "colt" || h.gender === "horse";
  if (male) {
    let base: number;
    const stud = h.stud;
    if (stud?.atStud && stud.standingFee > 0) {
      // Capitalize expected stud revenue over remaining prime years.
      const bookSize = stud.bookSize > 0 ? stud.bookSize : 100;
      const yearsRemaining = Math.max(1, STALLION_PRIME_END - h.age + 2);
      const fillRate = 0.65;
      const annual = stud.standingFee * bookSize * fillRate;
      // Simple present-value factor: capped multi-year multiplier.
      const pvYears = Math.min(6, yearsRemaining * 0.6);
      base = annual * pvYears;
      // Sire production quality lifts perceived value.
      const stakesRate = stud.lifetimeFoals > 0 ? stud.lifetimeStakesFoals / stud.lifetimeFoals : 0;
      base *= 1 + stakesRate * 1.2 + (stud.lifetimeG1Foals ?? 0) * 0.05;
    } else {
      // Projected stud value for racing / unproven males.
      base = overall * overall * 6 * potMod * pedMul * fameBoost * fanBoost;
      base *= 1 + winRate * 0.6;
    }
    const val = base * stallionAgeCurve(h.age);
    return Math.max(0, Math.round(val / 100) * 100);
  }

  // Filly / mare
  let base = overall * 220 * potMod * pedMul * fameBoost * fanBoost;
  const bh = h.blueHenStatus;
  const blueHen = bh?.blueHenScore ?? 0;
  const stakesWinners = bh?.stakesWinnersProduced ?? 0;
  const g1Winners = bh?.group1WinnersProduced ?? 0;
  const foals = bh?.foalsProduced ?? h.foalsProduced?.length ?? 0;
  base *= 1 + blueHen / 150 + stakesWinners * 0.15 + g1Winners * 0.35;
  if (h.isBlueHen || bh?.isBlueHen) base *= 1.5;
  // Foals produced compound record over expectation
  if (foals > 0) base *= 1 + Math.min(0.4, foals * 0.03);
  // Fertility & foaling ease temper the value.
  const fert = h.fertility ?? 0.9;
  const ease = h.foalingEase ?? 1.0;
  base *= 0.6 + fert * 0.35 + Math.max(0, (ease - 0.8) * 0.05);
  const val = base * mareAgeCurve(h.age);
  return Math.max(0, Math.round(val / 100) * 100);
}

/**
 * Blended market value combining racing form and breeding upside.
 * Weight shifts with age, gender, and racing viability.
 * @param h
 * @param allHorses
 */
export function horseMarketValue(h: Horse, allHorses: Horse[] = []): number {
  const racing = horsePriceWithPedigree(h, allHorses);
  const breeding = estimateBreedingValue(h, allHorses);

  if (h.gender === "gelding" || h.gelded) return racing;

  const retired = h.lifecycleStatus === "retired" || h.racingViable === false;
  if (retired) {
    // Post-career: value is almost entirely reproductive.
    return Math.round((racing * 0.15 + breeding * 0.9) / 50) * 50;
  }
  if (h.age <= 1) {
    // Yearling / pre-career: pedigree + upside dominate.
    return Math.round((racing * 0.5 + breeding * 0.5) / 50) * 50;
  }
  if (h.age <= 6) {
    // Racing prime: racing value leads, breeding is optionality.
    return Math.round((racing + breeding * 0.35) / 50) * 50;
  }
  // Older but still active: breeding takes over.
  return Math.round((racing * 0.4 + breeding * 0.8) / 50) * 50;
}

export interface HorseCareerValuation {
  /** Racing-only market value with pedigree adjustment. */
  racing: number;
  /** Estimated breeding-market value at current age. */
  breeding: number;
  /** Current blended market value (racing + breeding weighted). */
  current: number;
  /** Projected value at yearling age from pedigree + potential (before any racing record). */
  preCareer: number;
  /** Projected residual value once retired to stud/broodmare band (peak breeding age). */
  postCareer: number;
}

/**
 * Full-career valuation: pre-career (yearling), current, and post-career (retired residual).
 * Useful for market screens, auction reserves, and stallion/broodmare planning.
 * @param h
 * @param allHorses
 */
export function horseCareerValuation(h: Horse, allHorses: Horse[] = []): HorseCareerValuation {
  const racing = horsePriceWithPedigree(h, allHorses);
  const breeding = estimateBreedingValue(h, allHorses);
  const current = horseMarketValue(h, allHorses);

  // Pre-career: recompute as if the horse were a yearling — potential and pedigree drive it.
  const overall = calculateOverallRating(h);
  const potMod = 0.5 + (h.potential ?? 50) / 100;
  const pedMul = pedigreeMultiplier(
    { ...h, age: 1 },
    { horses: Object.fromEntries(allHorses.map((h) => [h.id, h])) },
  );
  const yearlingRacing = Math.round((overall * 80 * 1.2 * potMod) / 50) * 50;
  const yearlingPed = Math.round((yearlingRacing * pedMul) / 50) * 50;
  // Include a slice of gender-specific breeding upside since sales rings price yearlings on it.
  const breedingUpside =
    h.gender === "gelding" || h.gelded
      ? 0
      : Math.round(estimateBreedingValueAtAge(h, allHorses, 5) * 0.25);
  const preCareer = Math.round((yearlingPed + breedingUpside) / 50) * 50;

  // Post-career: value at prime breeding age, essentially pure breeding value.
  const postCareer =
    h.gender === "gelding" || h.gelded
      ? Math.round((racing * 0.1) / 100) * 100 // salvage / retirement value only
      : Math.round(
          estimateBreedingValueAtAge(
            h,
            allHorses,
            h.gender === "mare" || h.gender === "filly" ? 6 : 7,
          ) / 100,
        ) * 100;

  return { racing, breeding, current, preCareer, postCareer };
}

/**
 * Internal: estimate breeding value assuming a specific age (for pre/post-career projections).
 * @param h
 * @param allHorses
 * @param age
 */
function estimateBreedingValueAtAge(h: Horse, allHorses: Horse[], age: number): number {
  return estimateBreedingValue({ ...h, age }, allHorses);
}
