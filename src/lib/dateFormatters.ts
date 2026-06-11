/**
 * dateFormatters.ts - Centralized date formatting utilities
 *
 * Consolidates all game calendar date formatting logic. Components should
 * import from here instead of inlining dayOfYear math.
 */

import { gameCalendarDate, dayOfYear, gameYearNumber } from "@/core/calendar/dateFormatting";

/**
 * Format a game day as a human-readable calendar date (e.g., "Jan 15, 2026")
 */
export { gameCalendarDate };

/**
 * Get the day of year (1-365) from a game day
 */
export { dayOfYear };

/**
 * Get the in-game calendar year (starts at 2026 on day 1)
 */
export { gameYearNumber };

/**
 * Format a relative day label (e.g., "3 days ago", "in 2 days")
 */
export function relativeDayLabel(targetDay: number, referenceDay: number): string {
  const diff = targetDay - referenceDay;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

/**
 * Format a day as a short date string (e.g., "D145 Y2")
 */
export function shortDayLabel(day: number): string {
  const year = gameYearNumber(day);
  const dayOfYearValue = dayOfYear(day);
  return `D${dayOfYearValue} Y${year}`;
}
