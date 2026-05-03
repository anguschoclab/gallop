import type { Horse } from "@/game/types";

/**
 * Pure gender restriction checking
 * Returns whether a horse is eligible for a race based on gender restrictions
 * Extracted from: races.tsx, RaceDetailPanel.tsx, store.ts
 */

type GenderRestriction = "colt" | "filly" | "mares" | "fillies-and-mares" | "colts-and-fillies" | "horses" | undefined;

/**
 * Check if a horse's gender matches the race's gender restriction
 */
export function isGenderEligible(horseGender: Horse["gender"], restriction: GenderRestriction): boolean {
  if (!restriction) return true;
  
  const genderEligibilityMap: Record<string, Horse["gender"][]> = {
    colt: ["colt", "horse"],
    colts: ["colt", "horse"],
    filly: ["filly", "mare"],
    fillies: ["filly", "mare"],
    mares: ["mare"],
    "fillies-and-mares": ["filly", "mare"],
    "colts-and-fillies": ["colt", "filly", "horse", "mare"],
    horses: ["horse", "colt"],
  };
  
  return genderEligibilityMap[restriction]?.includes(horseGender) ?? false;
}

/**
 * Get a human-readable label for a gender restriction
 */
export function getGenderRestrictionLabel(restriction: GenderRestriction): string {
  if (!restriction) return "Open";
  const labelMap: Record<string, string> = {
    colt: "Colts",
    colts: "Colts",
    filly: "Fillies",
    fillies: "Fillies",
    mares: "Mares",
    "fillies-and-mares": "Fillies & Mares",
    "colts-and-fillies": "Colts & Fillies",
    horses: "Horses",
  };
  return labelMap[restriction] || restriction;
}
