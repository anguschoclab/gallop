import type { Horse } from "@/game/types";

/**
 * Pure gender restriction checking
 * Returns whether a horse is eligible for a race based on gender restrictions
 * Extracted from: races.tsx, RaceDetailPanel.tsx, store.ts
 */

type GenderRestriction = "colt" | "filly" | undefined;

/**
 * Check if a horse's gender matches the race's gender restriction
 */
export function isGenderEligible(horseGender: Horse["gender"], restriction: GenderRestriction): boolean {
  if (!restriction) return true;
  
  const genderEligibilityMap: Record<string, Horse["gender"][]> = {
    colt: ["colt", "horse"],
    filly: ["filly", "mare"],
  };
  
  return genderEligibilityMap[restriction].includes(horseGender);
}

/**
 * Get a human-readable label for a gender restriction
 */
export function getGenderRestrictionLabel(restriction: GenderRestriction): string {
  if (!restriction) return "Open";
  return restriction === "colt" ? "Colts" : "Fillies";
}
