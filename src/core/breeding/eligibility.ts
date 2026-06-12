/**
 * eligibility.ts - Breeding eligibility validation
 *
 * This file provides validation logic for horse breeding, checking age, gender,
 * health status, recovery periods, breeding seasons, and inbreeding restrictions.
 * It enforces realistic breeding constraints to prevent exploitative gameplay.
 *
 * Dependencies: @/game/types (Horse, Pregnancy), @/core/calendar/breedingCalendar (inBreedingSeason, nextBreedingSeasonStart), @/core/calendar/dateFormatting (dayOfYear, formatDate)
 * Related files: horseFactory.ts (uses canBreed for foaling), breedingCalendar.ts (season logic)
 */

import type { Horse, Pregnancy } from "@/game/types";
import { inBreedingSeason, nextBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { dayOfYear, formatDate } from "@/core/calendar/dateFormatting";
import { MARE_RECOVERY_DAYS, MIN_BREEDING_AGE, MAX_DAM_AGE } from "@/constants";

/**
 * Result of breeding eligibility check with optional reason for failure.
 */
export type BreedResult = { ok: true } | { ok: false; reason: string };

const SIRE_GENDERS: Horse["gender"][] = ["colt", "horse"];
const DAM_GENDERS: Horse["gender"][] = ["filly", "mare"];

/**
 * Check if a sire and dam can breed.
 *
 * Performs comprehensive validation including age, gender, health status,
 * pregnancy status, recovery period, breeding season, and inbreeding restrictions.
 *
 * @param sire - The sire horse
 * @param dam - The dam horse
 * @param day - Current game day
 * @param pregnancies - List of all pregnancies to check for existing pregnancy
 * @returns BreedResult with ok flag and optional reason for failure
 *
 * @example
 * const result = canBreed(sire, dam, currentDay, pregnancies);
 * if (result.ok) {
 *   breedHorses(sire, dam);
 * } else {
 *   showMessage(result.reason);
 * }
 */
export function canBreed(
  sire: Horse | undefined,
  dam: Horse | undefined,
  day: number,
  pregnancies: readonly Pregnancy[],
): BreedResult {
  if (!sire || !dam) return { ok: false, reason: "Sire or dam not found." };
  if (sire.id === dam.id) return { ok: false, reason: "A horse cannot breed with itself." };

  // Block breeding with deceased horses
  if (sire.lifecycleStatus === "deceased") {
    return { ok: false, reason: `Sire ${sire.name} is deceased.` };
  }
  if (dam.lifecycleStatus === "deceased") {
    return { ok: false, reason: `Dam ${dam.name} is deceased.` };
  }

  if (!SIRE_GENDERS.includes(sire.gender)) {
    const reason = sire.gender === "gelding" ? "has been gelded" : "is not male";
    return { ok: false, reason: `Sire ${sire.name} ${reason}.` };
  }
  if (!DAM_GENDERS.includes(dam.gender)) {
    return { ok: false, reason: `Dam ${dam.name} is not female.` };
  }

  if (sire.age < MIN_BREEDING_AGE) {
    return { ok: false, reason: `Sire is too young (must be ${MIN_BREEDING_AGE}+).` };
  }
  if (dam.age < MIN_BREEDING_AGE) {
    return { ok: false, reason: `Dam is too young (must be ${MIN_BREEDING_AGE}+).` };
  }
  if (dam.age > MAX_DAM_AGE) {
    return { ok: false, reason: `Dam is past breeding age (over ${MAX_DAM_AGE}).` };
  }

  // Parent–child: catch the obvious case via recorded sireName/damName.
  if (dam.sireName && dam.sireName === sire.name) {
    return { ok: false, reason: "Cannot breed parent to offspring." };
  }
  if (sire.damName && sire.damName === dam.name) {
    return { ok: false, reason: "Cannot breed parent to offspring." };
  }

  if (sire.healthStatus === "covering_sickness" || dam.healthStatus === "covering_sickness") {
    return { ok: false, reason: "Covering sickness (dourine) blocks breeding." };
  }

  if (pregnancies.some((p) => !p.resolved && p.damId === dam.id)) {
    return { ok: false, reason: `${dam.name} is already pregnant.` };
  }

  if (typeof dam.lastFoaledDay === "number" && day - dam.lastFoaledDay < MARE_RECOVERY_DAYS) {
    const remaining = MARE_RECOVERY_DAYS - (day - dam.lastFoaledDay);
    return { ok: false, reason: `${dam.name} is recovering (${remaining} days remaining).` };
  }

  // Breeding season — gate by the dam's hemisphere. Breeders ship mares to
  // hemisphere-matched stallions, so the dam's season is the one that
  // matters. Out-of-season requests are rejected with the next-open date.
  if (!inBreedingSeason(day, dam.hemisphere)) {
    const next = nextBreedingSeasonStart(day, dam.hemisphere);
    const opensOn = formatDate(dayOfYear(next));
    return { ok: false, reason: `Out of ${dam.hemisphere} breeding season. Opens ${opensOn}.` };
  }

  return { ok: true };
}
