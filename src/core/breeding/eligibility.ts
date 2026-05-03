import type { Horse, Pregnancy } from "@/game/types";

export type BreedResult = { ok: true } | { ok: false, reason: string };

// Mares need rest after foaling — gameplay isn't a real reproductive cycle,
// but breeding back-to-back every 30 days felt exploitable.
export const MARE_RECOVERY_DAYS = 60;
export const MIN_BREEDING_AGE = 3;
export const MAX_DAM_AGE = 20;

const SIRE_GENDERS: Horse["gender"][] = ["colt", "horse"];
const DAM_GENDERS: Horse["gender"][] = ["filly", "mare"];

export function canBreed(
  sire: Horse | undefined,
  dam: Horse | undefined,
  day: number,
  pregnancies: readonly Pregnancy[]
): BreedResult {
  if (!sire || !dam) return { ok: false, reason: "Sire or dam not found." };
  if (sire.id === dam.id) return { ok: false, reason: "A horse cannot breed with itself." };

  if (!SIRE_GENDERS.includes(sire.gender)) {
    return { ok: false, reason: `Sire ${sire.name} is not male.` };
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

  return { ok: true };
}
