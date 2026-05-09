import type { Horse, Hemisphere, GameState, StableTier } from "@/game/types";
import type { Stable } from "@/game/types";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";
import { calculateBaseHorseValue } from "@/core/horse/pricing";
import { isMaleHorse } from "@/core/horse/gender";

// Tier-driven defaults for retirement-to-stud parameters. Numbers chosen so
// that elite stallions are scarce, expensive, and command large books — and
// budget stallions remain available cheap for low-tier players.
const STUD_DEFAULTS: Record<StableTier, { fee: number; bookSize: number }> = {
  elite: { fee: 75000, bookSize: 180 },
  mid: { fee: 12000, bookSize: 120 },
  budget: { fee: 2500, bookSize: 80 },
};

export function defaultStudParams(tier: StableTier | undefined): { fee: number; bookSize: number } {
  return STUD_DEFAULTS[tier ?? "budget"];
}

// Decide which NPC stallions stand at stud at world generation. Tier-driven
// proportions: elite stables retire all male 5+ horses to stud, mid retire
// most, budget retire some. Player horses never start at stud — that's the
// player's call via the retireToStud action.
export function shouldRetireAtStartup(horse: Horse, stable: Stable | undefined): boolean {
  if (!stable) return false;
  if (!isMaleHorse(horse.gender)) return false;
  if (horse.age < 5) return false;
  if (stable.tier === "elite") return true;
  if (stable.tier === "mid") return horse.age >= 6;
  return horse.age >= 7;
}

/**
 * NPC stallions are retired based on performance and fame.
 * G1 winners are highly likely to stand at stud.
 */
export function isStallionMaterial(horse: Horse): boolean {
  if (!isMaleHorse(horse.gender)) return false;
  
  // Basic track performance criteria
  const hasG1Win = horse.raceHistory.some(
    (r) => r.position === 1 && r.grade === "G1",
  );
  const hasGradedWin = horse.raceHistory.some(
    (r) => r.position === 1 && (r.grade === "G2" || r.grade === "G3" || r.raceClass === "Stakes"),
  );

  // Elite performers or very famous ones
  if (hasG1Win) return true;
  if (hasGradedWin && horse.fame > 60) return true;
  if (horse.fame > 80) return true;

  return false;
}

/**
 * Recommended initial stud fee for a horse based on performance and value.
 * Used for both player and NPC retirement.
 */
export function calculateRecommendedStudFee(horse: Horse, stable?: Stable): number {
  const baseValue = calculateBaseHorseValue(horse, stable?.tier || "mid");
  
  // Calculate win frequency and quality
  const g1Wins = horse.raceHistory.filter(r => r.position === 1 && r.grade === "G1").length;
  const gradedWins = horse.raceHistory.filter(r => r.position === 1 && r.grade).length;
  const totalWins = horse.raceHistory.filter(r => r.position === 1).length;

  // Base fee is ~5-10% of market value, but weighted heavily by G1 wins
  let fee = baseValue * 0.1;

  if (g1Wins > 0) {
    fee += g1Wins * 10000;
  }
  
  if (gradedWins > 0) {
    fee += (gradedWins - g1Wins) * 3500;
  }

  // Bonus for overall win record
  if (totalWins > 5) {
    fee *= 1.2;
  }

  // Round to nearest $500
  return Math.round(fee / 500) * 500;
}

/**
 * Recalculate standing fee after new progeny results or major wins.
 */
export function recalcStandingFee(horse: Horse, currentDay: number): number {
  if (!horse.stud || !horse.stud.atStud) return 0;
  
  const currentFee = horse.stud.standingFee;
  let multiplier = 1.0;

  // Progeny performance impact
  const stakesRate = horse.stud.lifetimeFoals > 0 
    ? (horse.stud.lifetimeStakesFoals / horse.stud.lifetimeFoals)
    : 0;

  if (stakesRate > 0.1) multiplier += 0.25;
  if (stakesRate > 0.05) multiplier += 0.1;
  
  // Recent crop G1 win impact
  // (In a real system we'd track last update day, for now we just look at lifetime counts)
  if (horse.stud.lifetimeG1Foals > 2) multiplier += 0.5;

  // Aging impact: fee drops after age 15
  if (horse.age > 15) multiplier -= 0.1;
  if (horse.age > 18) multiplier -= 0.15;

  return Math.max(500, Math.round((currentFee * multiplier) / 500) * 500);
}

/**
 * valueOf — current financial value of the stallion to the stable.
 * Used for taxes, accounting, and AI buy/sell decisions.
 */
export function valueOf(horse: Horse, stable: Stable): number {
  const baseValue = calculateBaseHorseValue(horse, stable.tier);
  
  if (!horse.stud || !horse.stud.atStud) return baseValue;

  // Stud value is heavily influenced by their book size and fee
  const annualStudRevenue = horse.stud.standingFee * horse.stud.maxBookSize * 0.7; // 70% fill rate
  
  return baseValue + annualStudRevenue * 2; // Valued at base + 2 years of stud income
}
