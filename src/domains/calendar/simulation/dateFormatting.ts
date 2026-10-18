/**
 * dateFormatting.ts - Date formatting utilities
 *
 * This file provides pure date formatting functions for converting absolute game days
 * to human-readable calendar dates, month names, and parsing day inputs.
 *
 * Dependencies: None
 * Related files: breedingCalendar.ts (uses dayOfYear for breeding season calculations)
 */

/**
 * Pure date formatting functions.
 * Extracted from: track-schedule.tsx, canadian-calendar.tsx, uae-calendar.tsx,
 *                 south-american-calendar.tsx, german-calendar.tsx, scandinavian-calendar.tsx
 */

const CUMULATIVE_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

export const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Returns the full month name for a given day of year (1-365).
 *
 * @param dayOfYear - Day of year (1-365)
 * @returns Full month name
 *
 * @example
 * const month = getMonthName(15); // "January"
 */
export function getMonthName(dayOfYear: number): string {
  for (let i = 0; i < CUMULATIVE_DAYS.length; i++) {
    if (dayOfYear < CUMULATIVE_DAYS[i + 1]) {
      return MONTH_NAMES_FULL[i];
    }
  }
  return "December";
}

/**
 * Returns the formatted date string for a given day of year (e.g., "Jan 15").
 *
 * @param dayOfYear - Day of year (1-365)
 * @returns Formatted date string
 *
 * @example
 * const date = formatDate(15); // "Jan 15"
 */
export function formatDate(dayOfYear: number): string {
  for (let i = 0; i < CUMULATIVE_DAYS.length; i++) {
    if (dayOfYear < CUMULATIVE_DAYS[i + 1]) {
      const day = dayOfYear - CUMULATIVE_DAYS[i] + 1;
      return `${MONTH_NAMES_SHORT[i]} ${day}`;
    }
  }
  return "Dec 31";
}

/**
 * Returns the day of year (1–365) for an absolute game day (1-based, wraps every 365 days).
 *
 * @param day - Absolute game day
 * @returns Day of year (1-365)
 *
 * @example
 * const doy = dayOfYear(450); // 85
 */
export function dayOfYear(day: number): number {
  return ((day - 1) % 365) + 1;
}

/**
 * Returns the in-game calendar year (starts at 2026 on day 1).
 *
 * @param day - Absolute game day
 * @returns Calendar year
 *
 * @example
 * const year = gameYearNumber(1); // 2026
 */
export function gameYearNumber(day: number): number {
  return 2026 + Math.floor((day - 1) / 365);
}

/**
 * Returns a human-readable calendar date string (e.g., "Jan 15, 2026") for an absolute game day.
 *
 * @param day - Absolute game day
 * @returns Formatted calendar date string
 *
 * @example
 * const date = gameCalendarDate(15); // "Jan 15, 2026"
 */
export function gameCalendarDate(day: number): string {
  const doy = dayOfYear(day);
  const year = gameYearNumber(day);
  return `${formatDate(doy)}, ${year}`;
}

/**
 * Parses a day input string and returns the absolute game day.
 *
 * Supports formats:
 * - Absolute day number (e.g., "450")
 * - Day-of-year number (e.g., "15") - converts to current year's absolute day
 * - Month day format (e.g., "Jan 15") - converts to current year's absolute day
 *
 * @param input - Day input string
 * @param currentGameDay - Current absolute game day for context
 * @returns Absolute game day or null if invalid
 *
 * @example
 * const day = parseDayInput("Jan 15", 450); // 415 (Jan 15 of current year)
 */
export function parseDayInput(input: string, currentGameDay: number): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try parsing as absolute day number (e.g., "450")
  const absoluteDay = parseInt(trimmed, 10);
  if (!isNaN(absoluteDay) && absoluteDay > 0) {
    return absoluteDay;
  }

  // Try parsing as "Month Day" format (e.g., "Jan 15")
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2) {
    const monthPart = parts[0];
    const dayPart = parseInt(parts[1], 10);

    if (!isNaN(dayPart) && dayPart > 0 && dayPart <= 31) {
      // Find month index from full or short name
      const monthIndex = MONTH_NAMES_FULL.findIndex(
        (m) => m.toLowerCase() === monthPart.toLowerCase(),
      );
      const shortMonthIndex = MONTH_NAMES_SHORT.findIndex(
        (m) => m.toLowerCase() === monthPart.toLowerCase(),
      );

      const idx = monthIndex !== -1 ? monthIndex : shortMonthIndex;
      if (idx !== -1) {
        const dayOfYear = CUMULATIVE_DAYS[idx] + dayPart;
        if (dayOfYear <= 365) {
          // Convert day-of-year to absolute game day in current year
          const currentYear = gameYearNumber(currentGameDay);
          const yearStart = (currentYear - 2026) * 365 + 1;
          return yearStart + dayOfYear - 1;
        }
      }
    }
  }

  // Try parsing as day-of-year number (e.g., "15")
  const dayOfYear = parseInt(trimmed, 10);
  if (!isNaN(dayOfYear) && dayOfYear >= 1 && dayOfYear <= 365) {
    // Convert day-of-year to absolute game day in current year
    const currentYear = gameYearNumber(currentGameDay);
    const yearStart = (currentYear - 2026) * 365 + 1;
    return yearStart + dayOfYear - 1;
  }

  return null;
}

/**
 * Validates if a day-of-year is valid (1-365).
 *
 * @param day - Day of year to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * const valid = isValidDayOfYear(15); // true
 */
export function isValidDayOfYear(day: number): boolean {
  return day >= 1 && day <= 365;
}

/**
 * Format a relative day label (e.g., "3 days ago", "in 2 days")
 * @param targetDay
 * @param referenceDay
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
 * @param day
 */
export function shortDayLabel(day: number): string {
  const year = gameYearNumber(day);
  const dayOfYearValue = dayOfYear(day);
  return `D${dayOfYearValue} Y${year}`;
}
