import type { Horse, Hemisphere, GameState, StableTier } from "@/game/types";
import type { Stable } from "@/game/types";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";
import { calculateBaseHorseValue } from "@/core/horse/pricing";

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
  if (horse.gender !== "horse" && horse.gender !== "colt") return false;
  if (horse.age < 5) return false;
  if (stable.tier === "elite") return true;
  if (stable.tier === "mid") return horse.age >= 6;
  return horse.age >= 7;
}

// Compute the standing-fee for a stallion based on stable tier and the
// horse's stat profile. Uses the existing calculateNpcHorseValue infra
// scaled down so a brand-new stallion isn't priced like a proven sire.
export function initialStandingFee(horse: Horse, tier: StableTier): number {
  const { fee: tierBase } = STUD_DEFAULTS[tier];
  // Mix tier baseline with stat-based valuation; stat-driven half lets
  // exceptional budget stallions out-earn average mid stallions.
  const statValue = calculateBaseHorseValue(horse, tier);
  const blended = (tierBase + statValue * 0.4) / 2;
  return Math.round(blended / 500) * 500;
}

// Re-price a stallion based on his progeny record. Capped at 4× the original
// baseline to keep climbs convergent (stops a 3-G1-foal stallion from racing
// to $5M overnight). Called after each stakes/G1 win in resolveRace.
export function recalcStandingFee(
  baseFee: number,
  lifetimeStakesFoals: number,
  lifetimeG1Foals: number
): number {
  const multiplier = 1 + 0.15 * lifetimeStakesFoals + 0.4 * lifetimeG1Foals;
  const capped = Math.min(multiplier, 4);
  return Math.round((baseFee * capped) / 500) * 500;
}

// True if this stallion can accept a new booking right now: at-stud, has
// remaining book capacity, and is in his hemisphere's breeding season.
export function isStallionAvailable(stallion: Horse, day: number): boolean {
  if (!stallion.stud?.atStud) return false;
  if (stallion.stud.seasonBookings >= stallion.stud.bookSize) return false;
  if (!inBreedingSeason(day, stallion.hemisphere)) return false;
  return true;
}

// Returns the full set of stallions a mare can be booked to right now.
// Includes player-owned stallions and NPC stallions that match the mare's
// hemisphere. Sorted by fee ascending (cheapest first) for browsing.
export function getAvailableStallions(
  state: Pick<GameState, "horses" | "day">,
  mareHemisphere: Hemisphere
): Horse[] {
  return state.horses
    .filter((h) => h.stud?.atStud)
    .filter((h) => h.hemisphere === mareHemisphere)
    .filter((h) => isStallionAvailable(h, state.day))
    .sort((a, b) => (a.stud!.standingFee - b.stud!.standingFee));
}
