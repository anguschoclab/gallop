/**
 * calendar.ts - Cadence and boundary math for the simulation scheduler.
 *
 * The calendar is 1-based game days: Day 1-365 = Year 1, every 7 days a week
 * boundary, every 30 days a season ("month") boundary, every 365 a year.
 */

import {
  DAYS_PER_WEEK,
  SEASON_DAYS,
  DAYS_PER_YEAR,
} from "@/domains/calendar/model/calendarConstants";
import { getCurrentYear } from "@/domains/race/simulation/schedule";

export type PhaseCadence = "daily" | "weekly" | "seasonal" | "yearly" | "interval" | "event";

export function isWeeklyBoundary(day: number): boolean {
  return day % DAYS_PER_WEEK === 0;
}

export function isSeasonBoundary(day: number): boolean {
  return day % SEASON_DAYS === 0;
}

export function isYearBoundary(previousDay: number, newDay: number): boolean {
  return getCurrentYear(newDay) > getCurrentYear(previousDay);
}

/**
 * Decide whether a cadenced phase is due on `newDay`.
 *
 * - daily:    always due
 * - weekly:   due on day % 7 === 0 OR when >= 7 days elapsed since lastRunDay
 * - seasonal: due on day % 30 === 0 OR when >= 30 days elapsed since lastRunDay
 * - yearly:   due when the game year rolls over OR when >= 365 days elapsed
 * - interval: due when `intervalDays` have elapsed since `lastRunDay`
 * - event:    always evaluated (the phase's own skipIf decides)
 *
 * `lastRunDay` is the day the phase last produced output (stored in state),
 * or undefined if never run — in which case the phase is due.
 * @param options
 * @param options.cadence
 * @param options.newDay
 * @param options.previousDay
 * @param options.lastRunDay
 * @param options.intervalDays
 */
export function isPhaseDue(options: {
  cadence: PhaseCadence;
  newDay: number;
  previousDay: number;
  lastRunDay?: number;
  intervalDays?: number;
}): boolean {
  const { cadence, newDay, previousDay, lastRunDay, intervalDays } = options;
  switch (cadence) {
    case "daily":
    case "event":
      return true;
    case "weekly":
      if (lastRunDay === undefined) return true;
      return isWeeklyBoundary(newDay) || newDay - lastRunDay >= DAYS_PER_WEEK;
    case "seasonal":
      if (lastRunDay === undefined) return true;
      return isSeasonBoundary(newDay) || newDay - lastRunDay >= SEASON_DAYS;
    case "yearly":
      if (lastRunDay === undefined) return true;
      return isYearBoundary(previousDay, newDay) || newDay - lastRunDay >= DAYS_PER_YEAR;
    case "interval": {
      if (intervalDays === undefined || intervalDays <= 0) return true;
      if (lastRunDay === undefined) return true;
      return newDay - lastRunDay >= intervalDays;
    }
  }
}

/**
 * List all boundary days within (startDay, endDay] for a cadence.
 * Used by the advance planner to segment ranges.
 * @param startDay
 * @param endDay
 * @param cadence
 */
export function boundaryDaysInRange(
  startDay: number,
  endDay: number,
  cadence: PhaseCadence,
): number[] {
  const days: number[] = [];
  const period =
    cadence === "weekly"
      ? DAYS_PER_WEEK
      : cadence === "seasonal"
        ? SEASON_DAYS
        : cadence === "yearly"
          ? DAYS_PER_YEAR
          : undefined;
  if (period === undefined) return days;
  const first = Math.floor(startDay / period) * period + period;
  for (let d = first; d <= endDay; d += period) {
    days.push(d);
  }
  return days;
}
