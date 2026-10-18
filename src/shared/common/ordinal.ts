/**
 * ordinal.ts - Ordinal suffix calculation
 *
 * This file provides a pure function for converting numbers to their ordinal
 * suffix (1st, 2nd, 3rd, 4th, etc.).
 *
 * Dependencies: None
 * Related files: None
 */

/**
 * Get the ordinal suffix for a number.
 *
 * Returns the correct suffix (st, nd, rd, th) for a given number.
 *
 * @param n - The number to get the suffix for
 * @returns Ordinal suffix string
 *
 * @example
 * const suffix = getOrdinalSuffix(1); // "st"
 * const suffix = getOrdinalSuffix(22); // "nd"
 */
export function getOrdinalSuffix(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = n % 100;
  return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
}
