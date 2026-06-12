/**
 * math.ts - Math utility functions
 *
 * This file provides math utility functions including clamp, clampStat, and
 * clampPotential for numeric value normalization.
 *
 * Dependencies: None (self-contained functions)
 * Related files: Used throughout the codebase for stat normalization
 */

/**
 * Clamp a number between min and max values.
 *
 * Returns the number clamped to the specified range. Handles non-finite values
 * by returning the minimum value.
 *
 * @param n - The number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 */
export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/**
 * Clamp stat value to valid range [1, 100].
 *
 * Rounds the number then clamps it between 1 and 100. Used for stat fields
 * where values must be integers in this range.
 *
 * @param n - The stat value to clamp
 * @returns Clamped stat value
 */
export function clampStat(n: number): number {
  return clamp(Math.round(n), 1, 100);
}

/**
 * Clamp potential value to valid range [0, 100].
 *
 * Rounds the number then clamps it between 0 and 100. Used for potential
 * and form magnitude where 0 is a legal value.
 *
 * @param n - The potential value to clamp
 * @returns Clamped potential value
 */
export function clampPotential(n: number): number {
  return clamp(Math.round(n), 0, 100);
}
