import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Concatenate class names with tailwind-merge support.
 *
 * @param inputs - Array of class values to merge
 * @returns Merged class name string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Group an array of race-like objects by their day.
 *
 * @param races - Array of objects containing a day property
 * @returns Sorted array of groups by day
 */
export function groupRacesByDate<T extends { day: number }>(races: T[]) {
  const grouped = new Map<number, T[]>();
  for (const race of races) {
    if (!grouped.has(race.day)) {
      grouped.set(race.day, []);
    }
    grouped.get(race.day)!.push(race);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, races]) => ({ day, races: races.sort((a, b) => a.day - b.day) }));
}
