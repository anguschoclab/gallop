/**
 * raceBooking.ts — keep rival horses to a realistic racing schedule.
 *
 * Rival stables used to enter the same horse in every suitable race in the
 * look-ahead window, so one horse could run dozens of races on a single day.
 * That inflated their wins and prize money and drained stable cash through
 * entry fees until big studs went bankrupt. These helpers track which days each
 * rival horse is already booked to run and enforce rest between starts.
 */

import type { Horse, Race } from "@/platform/game/types";

/** Minimum days between two starts for a rival horse. */
export const NPC_MIN_DAYS_BETWEEN_STARTS = 3;

/** horseId → race days the horse is already entered for. */
export type NpcBookings = Map<string, number[]>;

/**
 * Collect the race days each horse is already entered for.
 * @param races - Races to scan (resolved and cancelled races are ignored).
 * @param onlyHorseIds - Optional filter to the horses you care about.
 */
export function buildNpcBookings(
  races: readonly Race[],
  onlyHorseIds?: ReadonlySet<string>,
): NpcBookings {
  const bookings: NpcBookings = new Map();
  for (const race of races) {
    if (race.resolved || race.cancelled) continue;
    for (const entry of race.entries) {
      if (onlyHorseIds && !onlyHorseIds.has(entry.horseId)) continue;
      addNpcBooking(bookings, entry.horseId, race.day);
    }
  }
  return bookings;
}

export function addNpcBooking(bookings: NpcBookings, horseId: string, day: number): void {
  const days = bookings.get(horseId);
  if (days) days.push(day);
  else bookings.set(horseId, [day]);
}

export function removeNpcBooking(bookings: NpcBookings, horseId: string, day: number): void {
  const days = bookings.get(horseId);
  if (!days) return;
  const i = days.indexOf(day);
  if (i !== -1) days.splice(i, 1);
}

/**
 * True when the horse can be entered for a race on `day`: no other start
 * booked within the rest window either side, and enough rest since its last run.
 */
export function canBookNpcStart(
  bookings: NpcBookings,
  horse: Pick<Horse, "id" | "lastRaceDay">,
  day: number,
  minGap = NPC_MIN_DAYS_BETWEEN_STARTS,
): boolean {
  if (horse.lastRaceDay !== undefined && day - horse.lastRaceDay < minGap) return false;
  const days = bookings.get(horse.id);
  if (!days) return true;
  for (const d of days) if (Math.abs(d - day) < minGap) return false;
  return true;
}
