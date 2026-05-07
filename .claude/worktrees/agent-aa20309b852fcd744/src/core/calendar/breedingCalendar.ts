import type { Hemisphere } from "@/game/types";
import { dayOfYear } from "./dateFormatting";

// Real-world breeding seasons (approximate):
//   Northern: Feb 5 (DoY 36) → Jun 16 (DoY 167) — covers Feb-mid-Jun.
//   Southern: Sep 1 (DoY 244) → Dec 16 (DoY 350) — Spring/Summer south of equator.
// These ranges fit within a single calendar year (no wrap), which keeps the
// `inBreedingSeason` check simple. If we ever extend Southern past Dec 31 the
// wrap logic will need revisiting.
export const BREEDING_SEASON: Record<Hemisphere, { startDoy: number; endDoy: number }> = {
  Northern: { startDoy: 36, endDoy: 167 },
  Southern: { startDoy: 244, endDoy: 350 },
};

// Universal birthday: every thoroughbred ages up on a fixed calendar date
// regardless of actual foaling day. Northern: Jan 1; Southern: Aug 1 (DoY 213).
export const UNIVERSAL_BIRTHDAY: Record<Hemisphere, number> = {
  Northern: 1,
  Southern: 213,
};

export function inBreedingSeason(day: number, hemisphere: Hemisphere): boolean {
  const doy = dayOfYear(day);
  const { startDoy, endDoy } = BREEDING_SEASON[hemisphere];
  return doy >= startDoy && doy <= endDoy;
}

// Returns the absolute game day on which the next breeding season opens for
// the given hemisphere. If we're currently inside the season, returns the
// start of *this* season (i.e. today doesn't count as "next").
export function nextBreedingSeasonStart(day: number, hemisphere: Hemisphere): number {
  const doy = dayOfYear(day);
  const { startDoy } = BREEDING_SEASON[hemisphere];
  const yearOffset = day - doy; // absolute day at DoY 1 of current year
  if (doy < startDoy) return yearOffset + startDoy;
  if (doy > BREEDING_SEASON[hemisphere].endDoy) return yearOffset + 365 + startDoy;
  return yearOffset + startDoy; // we're in season; "next" reads as the current season start
}

export function isUniversalBirthday(day: number, hemisphere: Hemisphere): boolean {
  return dayOfYear(day) === UNIVERSAL_BIRTHDAY[hemisphere];
}

// True at the very first day of a given hemisphere's breeding season — used to
// reset stallion book-counters and run NPC mating planning.
export function isBreedingSeasonStart(day: number, hemisphere: Hemisphere): boolean {
  return dayOfYear(day) === BREEDING_SEASON[hemisphere].startDoy;
}
