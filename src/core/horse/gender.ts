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
