/**
 * gender.ts - Gender eligibility checking
 *
 * This file provides pure functions for checking gender eligibility for races
 * and determining horse gender characteristics.
 *
 * Dependencies: @/game/types (Horse, HorseGender), @/game/rng (Rng)
 * Related files: race/eligibility.ts (uses gender checks), races.tsx (uses for race display)
 */

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
 * Check if a horse's gender matches the race's gender restriction.
 *
 * Evaluates whether a horse is eligible for a race based on the race's
 * gender restriction (e.g., colts-only, fillies-and-mares, etc.).
 *
 * @param horseGender - The horse's gender
 * @param restriction - The race's gender restriction string
 * @returns True if the horse is eligible for the race
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
 * Roll for gender based on standard population distribution.
 *
 * Generates a random gender for a new horse based on standard
 * population distribution: 50% male (Colt), 50% female (Filly).
 *
 * @param rng - Random number generator
 * @returns Gender (colt or filly)
 */
export function rollGender(rng: Rng): Horse["gender"] {
  return rng.next() < 0.5 ? "colt" : "filly";
}

/**
 * Get gender from boolean (isMale) and age.
 *
 * Determines the appropriate horse gender based on sex, age, and
 * gelding status. Colts/fillies under age 4 become horses/mares.
 *
 * @param isMale - Whether the horse is male
 * @param age - The horse's age
 * @param isGelding - Whether the horse has been gelded (optional)
 * @returns Horse gender (colt, filly, horse, mare, or gelding)
 */
export function getGenderFromProps(
  isMale: boolean,
  age: number,
  isGelding?: boolean,
): Horse["gender"] {
  if (age < 4) {
    return isMale ? "colt" : "filly";
  }
  if (isMale) return isGelding ? "gelding" : "horse";
  return "mare";
}

export const SIRE_GENDERS: HorseGender[] = ["colt", "horse"];
export const DAM_GENDERS: HorseGender[] = ["filly", "mare"];

/**
 * Check if a horse gender is male.
 *
 * @param gender - Horse gender
 * @returns True if male (colt, horse, or gelding)
 */
export function isMaleHorse(gender: HorseGender): boolean {
  return gender === "colt" || gender === "horse" || gender === "gelding";
}

/**
 * Check if a horse gender is female.
 *
 * @param gender - Horse gender
 * @returns True if female (filly or mare)
 */
export function isFemaleHorse(gender: HorseGender): boolean {
  return gender === "filly" || gender === "mare";
}

/**
 * Get display label for horse gender.
 *
 * @param gender - Horse gender
 * @returns Capitalized gender label
 */
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
  }
}

/**
 * Get display label for gender restriction.
 *
 * @param restriction - The gender restriction string
 * @returns Human-readable gender restriction label
 */
export function getGenderRestrictionLabel(restriction: string | undefined): string {
  if (!restriction) return "Open";

  const normalized = restriction.toLowerCase();
  if (normalized === "colt" || normalized === "colts") return "Colts";
  if (normalized === "filly" || normalized === "fillies") return "Fillies";
  if (normalized === "mares") return "Mares";
  if (normalized === "fillies-and-mares") return "Fillies & Mares";
  if (normalized === "colts-and-fillies") return "Colts & Fillies";
  if (normalized === "horses") return "Horses";

  return restriction;
}

/**
 * Get gender symbol for display.
 *
 * @param gender - Horse gender
 * @returns Unicode gender symbol (♂, ♀, or ⚲ for gelding)
 */
export function genderSymbol(gender: HorseGender): string {
  if (gender === "gelding") return "⚲";
  return gender === "colt" || gender === "horse" ? "♂" : "♀";
}

/**
 * Transition a male horse (Colt/Horse) to a Gelding.
 *
 * Converts a colt or horse to a gelding. This improves consistency
 * (reduces noise) but removes breeding capability.
 *
 * @param h - The horse to geld
 * @returns Updated horse with gelding gender
 */
export function geldHorse(h: Horse): Horse {
  if (h.gender !== "colt" && h.gender !== "horse") return h;

  return {
    ...h,
    gender: "gelding",
  };
}
