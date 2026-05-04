/**
 * Pure date formatting functions
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
 * Returns the full month name for a given day of year (1-365)
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
 * Returns the formatted date string for a given day of year (e.g., "Jan 15")
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
 * Returns the day of year (1–365) for an absolute game day (1-based, wraps every 365 days)
 */
export function dayOfYear(day: number): number {
  return ((day - 1) % 365) + 1;
}

/**
 * Returns the in-game calendar year (starts at 2026 on day 1)
 */
export function gameYearNumber(day: number): number {
  return 2026 + Math.floor((day - 1) / 365);
}

/**
 * Returns a human-readable calendar date string (e.g., "Jan 15, 2026") for an absolute game day
 */
export function gameCalendarDate(day: number): string {
  const doy = dayOfYear(day);
  const year = gameYearNumber(day);
  return `${formatDate(doy)}, ${year}`;
}
