/**
 * formatting.ts — Pure string formatting utilities.
 * Extracted from UI components to allow use in store slices and core logic
 * without importing React components.
 */

/**
 * Format a number as currency with proper typography.
 *
 * @param amount - The numeric value to format
 * @returns Formatted currency string (e.g. "$1,000")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format race time with proper decimal precision.
 *
 * @param seconds - Total time in seconds
 * @param decimals - Number of decimal places (1 or 2, defaults to 2)
 * @returns Formatted time string (e.g. "92.41s")
 */
export function formatTime(seconds: number, decimals: 1 | 2 = 2): string {
  return `${seconds.toFixed(decimals)}s`;
}

/** Metres in one mile. */
const METRES_PER_MILE = 1609.344;

/**
 * Format seconds as a clock time, optionally dropping the leading minute.
 *
 * @param seconds - Total time in seconds
 * @param decimals - Decimal places (default 2)
 * @param dropMinute - When true, omit the minute portion (e.g. "07.52" for 1:07.52)
 * @returns Formatted clock string (e.g. "1:07.52" or "07.52")
 */
export function formatClockTime(seconds: number, decimals: 1 | 2 = 2, dropMinute = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const mins = Math.floor(seconds / 60);
  const rem = seconds - mins * 60;
  const secStr = rem.toFixed(decimals).padStart(decimals + 3, "0");
  if (dropMinute || mins === 0) return secStr;
  return `${mins}:${secStr}`;
}

/**
 * Seconds per kilometre for a run of `distance` metres in `seconds`.
 *
 * @param seconds - Total time in seconds
 * @param distance - Distance in metres
 */
export function pacePerKm(seconds: number, distance: number): number {
  return distance > 0 ? (seconds / distance) * 1000 : NaN;
}

/**
 * Seconds per mile for a run of `distance` metres in `seconds`.
 *
 * @param seconds - Total time in seconds
 * @param distance - Distance in metres
 */
export function pacePerMile(seconds: number, distance: number): number {
  return distance > 0 ? (seconds / distance) * METRES_PER_MILE : NaN;
}

export interface RaceTimeView {
  key: "final" | "perKm" | "perKmDrop" | "perMile" | "perMileDrop";
  label: string;
  value: string;
}

/**
 * Build the five standard presentations of a race time.
 *
 * @param seconds - Final time in seconds
 * @param distance - Race distance in metres
 * @returns Ordered list of labelled time views
 */
export function buildRaceTimeViews(seconds: number, distance: number): RaceTimeView[] {
  const km = pacePerKm(seconds, distance);
  const mile = pacePerMile(seconds, distance);
  return [
    { key: "final", label: "Final time", value: formatClockTime(seconds) },
    { key: "perKm", label: "Per km", value: formatClockTime(km) },
    { key: "perKmDrop", label: "Per km (drop min)", value: formatClockTime(km, 2, true) },
    { key: "perMile", label: "Per mile", value: formatClockTime(mile) },
    { key: "perMileDrop", label: "Per mile (drop min)", value: formatClockTime(mile, 2, true) },
  ];
}
