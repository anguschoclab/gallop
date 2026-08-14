/**
 * timeWindow.ts - Shared "last N weeks" analytics window.
 *
 * Pure helpers used by every analytics chart set so jockey, training, stable
 * and regional trends can be compared over the exact same period.
 */

export type TimeWindowWeeks = 4 | 8 | 12 | 26 | 52 | 0;

/** 0 means "career / all time". */
export const TIME_WINDOW_OPTIONS: { value: TimeWindowWeeks; label: string }[] = [
  { value: 4, label: "4 wks" },
  { value: 8, label: "8 wks" },
  { value: 12, label: "12 wks" },
  { value: 26, label: "26 wks" },
  { value: 52, label: "52 wks" },
  { value: 0, label: "All time" },
];

export const DAYS_PER_WEEK = 7;

export function timeWindowLabel(weeks: TimeWindowWeeks): string {
  return TIME_WINDOW_OPTIONS.find((o) => o.value === weeks)?.label ?? `${weeks} wks`;
}

/** First in-window day (exclusive lower bound). Negative infinity for all-time.
 * @param currentDay - The current day number.
 * @param weeks - The window size in weeks (0 means all-time).
 */
export function windowStartDay(currentDay: number, weeks: TimeWindowWeeks): number {
  if (!weeks) return Number.NEGATIVE_INFINITY;
  return currentDay - weeks * DAYS_PER_WEEK;
}

export function isInWindow(day: number, currentDay: number, weeks: TimeWindowWeeks): boolean {
  if (!weeks) return true;
  return day > windowStartDay(currentDay, weeks) && day <= currentDay;
}

/** Bucket index 0..weeks-1, oldest first. Returns -1 when out of window.
 * @param day - The day number to bucket.
 * @param currentDay - The current day number.
 * @param weeks - The window size in weeks (0 means all-time).
 */
export function weekBucket(day: number, currentDay: number, weeks: TimeWindowWeeks): number {
  if (!weeks) return -1;
  if (!isInWindow(day, currentDay, weeks)) return -1;
  const daysAgo = currentDay - day;
  const fromEnd = Math.floor(daysAgo / DAYS_PER_WEEK);
  return Math.max(0, Math.min(weeks - 1, weeks - 1 - fromEnd));
}

export function filterByWindow<T extends { day: number }>(
  rows: T[],
  currentDay: number,
  weeks: TimeWindowWeeks,
): T[] {
  if (!weeks) return rows;
  return rows.filter((r) => isInWindow(r.day, currentDay, weeks));
}
