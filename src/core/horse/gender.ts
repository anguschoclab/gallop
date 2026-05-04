import type { Horse, HorseGender } from "@/game/types";
import type { Rng } from "@/game/rng";

/**
 * Pure gender restriction checking
 * Returns whether a horse is eligible for a race based on gender restrictions
 * Extracted from: races.tsx, RaceDetailPanel.tsx, store.ts
 */

type GenderRestriction = "colt" | "filly" | "mares" | "fillies-and-mares" | "colts-and-fillies" | "horses" | undefined;

/**
 * Check if a horse's gender matches the race's gender restriction
 */
export function isGenderEligible(horseGender: Horse["gender"], restriction: string | undefined): boolean {
  if (!restriction) return true;
  
  const normalized = restriction.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

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
    "open": ["colt", "filly", "horse", "mare", "gelding"],
    horses: ["horse", "colt", "gelding"],
    "colts-and-geldings": ["colt", "horse", "gelding"],
  };
  
  // Try direct match or fuzzy match
  if (genderEligibilityMap[normalized]) return genderEligibilityMap[normalized].includes(horseGender);
  
  // Fallback: search for keywords
  if (normalized.includes("filly") || normalized.includes("mare")) {
    if (normalized.includes("colt") || normalized.includes("horse") || normalized.includes("gelding")) {
        return ["colt", "filly", "horse", "mare", "gelding"].includes(horseGender);
    }
    return ["filly", "mare"].includes(horseGender);
  }
  
  if (normalized.includes("colt") || normalized.includes("horse") || normalized.includes("gelding")) {
    return ["colt", "horse", "gelding"].includes(horseGender);
  }

  return true;
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
    "colts-and-geldings": "Colts & Geldings",
  };
  return labelMap[restriction] || restriction;
}

/**
 * Roll a gender for a newly generated horse. Canonical implementation —
 * horseGen.ts, npcHorseGen.ts, and createHorseFromDNA all defer here.
 *
 * Rules:
 *  - 55% male, 45% female
 *  - 35% of males are gelded (for racing consistency)
 *  - Colts/fillies up to age 4; horse/mare at 5+
 */
export function rollGender(age: number, rng: Rng): HorseGender {
  const isMale = rng.next() < 0.55;
  const isGelding = isMale && rng.next() < 0.35;

  if (age <= 4) {
    if (isMale) return isGelding ? "gelding" : "colt";
    return "filly";
  }
  if (isMale) return isGelding ? "gelding" : "horse";
  return "mare";
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

