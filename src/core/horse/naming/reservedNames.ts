/**
 * reservedNames.ts - Horse name reservation utilities
 *
 * This file provides utilities for managing horse name reservations after death.
 * Names are reserved for 25 years (9,125 days) from the date of death.
 *
 * Dependencies: None (pure utilities)
 * Related files: jockeyClubRules.ts (uses for validation), nameGenerator.ts (uses for generation)
 */

export interface ReservedNameEntry {
  name: string;
  deceasedOnDay: number;
  releasedOnDay: number;
}

export const NAME_RESERVATION_DAYS = 9125; // 25 years * 365 days

/**
 * Check if a name is currently reserved (within the 25-year reservation period).
 */
export function isNameReserved(
  name: string,
  reservedNames: ReservedNameEntry[],
  currentDay: number,
): boolean {
  const lowerName = name.toLowerCase();
  const entry = reservedNames.find((r) => r.name === lowerName);
  if (!entry) return false;
  return currentDay < entry.releasedOnDay;
}

/**
 * Calculate the release day for a name based on death day.
 */
export function getReservationReleaseDay(deceasedOnDay: number): number {
  return deceasedOnDay + NAME_RESERVATION_DAYS;
}

/**
 * Add a name to the reserved list when a horse dies.
 * Prevents duplicate entries.
 */
export function addReservedName(
  name: string,
  deceasedOnDay: number,
  reservedNames: ReservedNameEntry[],
): ReservedNameEntry[] {
  const lowerName = name.toLowerCase();
  // Don't duplicate if already reserved
  if (reservedNames.some((r) => r.name === lowerName)) {
    return reservedNames;
  }
  return [
    ...reservedNames,
    {
      name: lowerName,
      deceasedOnDay,
      releasedOnDay: getReservationReleaseDay(deceasedOnDay),
    },
  ];
}

/**
 * Remove expired reservations (names whose 25-year period has ended).
 */
export function cleanupExpiredReservations(
  reservedNames: ReservedNameEntry[],
  currentDay: number,
): ReservedNameEntry[] {
  return reservedNames.filter((r) => currentDay < r.releasedOnDay);
}

/**
 * Get a Set of all currently reserved names for quick lookup.
 */
export function getReservedNamesSet(
  reservedNames: ReservedNameEntry[],
  currentDay: number,
): Set<string> {
  const active = reservedNames.filter((r) => currentDay < r.releasedOnDay);
  return new Set(active.map((r) => r.name));
}
