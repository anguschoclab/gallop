import type { Horse, HorseGender } from "@/game/types";
import type { Rng } from "@/game/rng";

/**
 * Pure gender restriction checking
 * Returns whether a horse is eligible for a race based on gender restrictions
 * Extracted from: races.tsx, RaceDetailPanel.tsx, store.ts
 */

type GenderRestriction =
  | "colt"
  | "filly"
  | "mares"
  | "fillies-and-mares"
  | "colts-and-fillies"
  | "horses"
  | undefined;

/**
 * Check if a horse's gender matches the race's gender restriction
 */
export function isGenderEligible(
  horseGender: Horse["gender"],
  restriction: string | undefined,
): boolean {
  if (!restriction) return true;

  const normalized = restriction
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  const genderEligibilityMap: Record<string, Horse["gender"][]> = {
    colt: ["colt", "horse", "gelding"],
    colts: ["colt", "horse", "gelding"],
    "colt-horse": ["colt", "horse", "gelding"],
    "colts-and-horses": ["colt", "horse", "gelding"],
    filly: ["filly", "mare"],
    fillies: ["filly", "mare"],
    "filly-mare": ["filly", "mare"],
    "fillies-and-mares": ["filly", "mare"],
    mare: ["mare"],
    mares: ["mare"],
    "colts-and-fillies": ["colt", "filly", "horse", "mare", "gelding"],
    open: ["colt", "filly", "horse", "mare", "gelding"],
    horses: ["horse", "colt", "gelding"],
    "colts-and-geldings": ["colt", "horse", "gelding"],
  };

  // Try direct match or fuzzy match
  return genderEligibilityMap[normalized]?.includes(horseGender) ?? true;
}

/**
 * Roll for gender based on standard population distribution
 * - Male (Colt): 50%
 * - Female (Filly): 50%
 */
export function rollGender(rng: Rng): Horse["gender"] {
  return rng.next() < 0.5 ? "colt" : "filly";
}

/**
 * Get gender from boolean (isMale) and age
 */
export function getGenderFromProps(isMale: boolean, age: number, isGelding?: boolean): Horse["gender"] {
  if (age < 4) {
    return isMale ? "colt" : "filly";
  }
  if (isMale) return isGelding ? "gelding" : "horse";
  return "mare";
}

export const SIRE_GENDERS: HorseGender[] = ["colt", "horse"];
export const DAM_GENDERS: HorseGender[] = ["filly", "mare"];

export function isMaleHorse(gender: HorseGender): boolean {
  return gender === "colt" || gender === "horse" || gender === "gelding";
}

export function isFemaleHorse(gender: HorseGender): boolean {
  return gender === "filly" || gender === "mare";
}

export function genderLabel(gender: HorseGender): string {
  switch (gender) {
    case "colt":
      return "Colt";
    case "filly":
      return "Filly";
    case "horse":
      return "Horse";
    case "mare":
      return "Mare";
    case "gelding":
      return "Gelding";
    default:
      return gender;
  }
}

export function genderSymbol(gender: HorseGender): string {
  if (gender === "gelding") return "⚲";
  return gender === "colt" || gender === "horse" ? "♂" : "♀";
}

/**
 * Transition a male horse (Colt/Horse) to a Gelding.
 * Improves consistency (reduces noise) but removes breeding capability.
 */
export function geldHorse(h: Horse): Horse {
  if (h.gender !== "colt" && h.gender !== "horse") return h;

  return {
    ...h,
    gender: "gelding",
  };
}
