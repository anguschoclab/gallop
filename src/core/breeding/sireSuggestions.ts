import type { Horse } from "@/game/types";
import { calculateBreedingCompatibility } from "@/core/breeding/compatibility";
import { BREEDING_FEE } from "@/constants";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";

export interface SireSuggestion {
  stallion: Horse;
  compatibilityScore: number;
  fee: number;
  reason: string;
}

function scoreToReason(score: number): string {
  if (score >= 0.8) return "Excellent match";
  if (score >= 0.65) return "Good match";
  if (score >= 0.5) return "Acceptable match";
  return "Risky match";
}

export function suggestBestSires(
  mare: Horse | undefined,
  stallions: Horse[],
  day: number,
  limit = 5,
): SireSuggestion[] {
  if (!mare) return [];

  const candidates = stallions.filter((s) => {
    if (!s.stud?.atStud) return false;
    if (s.lifecycleStatus === "deceased") return false;
    if (s.healthStatus === "covering_sickness") return false;
    if (s.hemisphere !== mare.hemisphere) return false;
    if (s.stud.seasonBookings >= s.stud.bookSize) return false;
    if (!inBreedingSeason(day, s.hemisphere)) return false;
    return true;
  });

  const scored = candidates.map((stallion) => {
    const compat = calculateBreedingCompatibility(stallion, mare);
    const isExternal = !!stallion.stableId;
    const fee = isExternal ? BREEDING_FEE + stallion.stud!.standingFee : 0;
    return {
      stallion,
      compatibilityScore: compat.overallScore,
      fee,
      reason: scoreToReason(compat.overallScore),
    };
  });

  scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  return scored.slice(0, limit);
}
