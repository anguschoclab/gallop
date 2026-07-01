/**
 * nominationFees.ts — Stakes nomination fee schedule and helpers.
 *
 * Pure functions and types for the graded-race pre-nomination system.
 * Fees escalate as the race approaches; late G1 nominations are disallowed.
 */

export type NominationTier = "early" | "standard" | "late";
export type NominationStatus = "active" | "scratched" | "entered";

export interface NominationRecord {
  id: string;
  horseId: string;
  raceId: string;
  raceName: string;
  raceDay: number;
  grade: "G1" | "G2" | "G3";
  tier: NominationTier;
  feePaid: number;
  nominatedDay: number;
  status: NominationStatus;
}

// Fee schedule (see plan). `null` = not available.
export const NOMINATION_FEE_G1_EARLY = 2000;
export const NOMINATION_FEE_G1_STANDARD = 5000;
export const NOMINATION_FEE_G1_LATE: number | null = null;

export const NOMINATION_FEE_G2_EARLY = 800;
export const NOMINATION_FEE_G2_STANDARD = 2000;
export const NOMINATION_FEE_G2_LATE = 10000;

export const NOMINATION_FEE_G3_EARLY = 400;
export const NOMINATION_FEE_G3_STANDARD = 1000;
export const NOMINATION_FEE_G3_LATE = 5000;

export const NOMINATION_TIER_EARLY_DAYS_THRESHOLD = 90;
export const NOMINATION_TIER_STANDARD_DAYS_THRESHOLD = 30;

export function getNominationTier(daysUntilRace: number): NominationTier {
  if (daysUntilRace >= NOMINATION_TIER_EARLY_DAYS_THRESHOLD) return "early";
  if (daysUntilRace >= NOMINATION_TIER_STANDARD_DAYS_THRESHOLD) return "standard";
  return "late";
}

const FEE_TABLE: Record<"G1" | "G2" | "G3", Record<NominationTier, number | null>> = {
  G1: {
    early: NOMINATION_FEE_G1_EARLY,
    standard: NOMINATION_FEE_G1_STANDARD,
    late: NOMINATION_FEE_G1_LATE,
  },
  G2: {
    early: NOMINATION_FEE_G2_EARLY,
    standard: NOMINATION_FEE_G2_STANDARD,
    late: NOMINATION_FEE_G2_LATE,
  },
  G3: {
    early: NOMINATION_FEE_G3_EARLY,
    standard: NOMINATION_FEE_G3_STANDARD,
    late: NOMINATION_FEE_G3_LATE,
  },
};

export function calculateNominationFee(
  grade: "G1" | "G2" | "G3" | null | undefined,
  tier: NominationTier,
): number | null {
  if (!grade || !FEE_TABLE[grade]) return null;
  return FEE_TABLE[grade][tier];
}

export function getRaceGrade(race: {
  graded?: { grade?: "G1" | "G2" | "G3" };
  graded_override?: { grade?: "G1" | "G2" | "G3" };
}): "G1" | "G2" | "G3" | null {
  return race.graded_override?.grade ?? race.graded?.grade ?? null;
}
