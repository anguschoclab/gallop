/**
 * restrictions.ts - Race restriction formatting logic
 *
 * This file provides pure functions for formatting race restrictions for display,
 * including age restrictions, gender restrictions, and combined restriction strings.
 *
 * Dependencies: @/game/types (Race)
 * Related files: Used throughout UI components for displaying race eligibility requirements
 */

import type { Race } from "@/game/types";

/**
 * Pure restriction formatting logic
 * Extracted from: RaceDetailPanel.tsx, calendar files
 */

/**
 * Format age restrictions for display.
 *
 * Returns a human-readable string for age restrictions like "2+ YO", "2-3YO", or "3YO only".
 *
 * @param restrictions - Race restrictions object
 * @param restrictions.minAge - Minimum horse age
 * @param restrictions.maxAge - Maximum horse age
 * @param restrictions.gender - Optional gender filter
 * @param restrictions.minAgeNorthern - Minimum age for Northern hemisphere horses
 * @param restrictions.minAgeSouthern - Minimum age for Southern hemisphere horses
 * @returns Formatted age restriction string
 *
 * @example
 * const ageStr = formatAgeRestrictions({ minAge: 2, maxAge: 3 });
 * // Returns "2-3YO"
 */
export function formatAgeRestrictions(restrictions?: {
  minAge?: number;
  maxAge?: number;
  gender?: string;
  minAgeNorthern?: number;
  minAgeSouthern?: number;
}): string {
  if (!restrictions || restrictions.minAge === undefined) {
    return "";
  }

  if (restrictions.minAge === restrictions.maxAge) {
    return `${restrictions.minAge}YO only`;
  }

  if (restrictions.maxAge) {
    return `${restrictions.minAge}-${restrictions.maxAge}YO`;
  }

  return `${restrictions.minAge}+ YO`;
}

/**
 * Format gender restriction for display.
 *
 * Returns a human-readable string for gender restrictions like "Colts only", "Fillies only", etc.
 *
 * @param gender - The gender restriction string
 * @returns Formatted gender restriction string
 *
 * @example
 * const genderStr = formatGenderRestriction("colt");
 * // Returns "Colts only"
 */
export function formatGenderRestriction(gender?: string): string {
  if (!gender) {
    return "";
  }

  const genderMap: Record<string, string> = {
    colt: "Colts only",
    colts: "Colts only",
    filly: "Fillies only",
    fillies: "Fillies only",
    horse: "Horses only",
    horses: "Horses only",
    mare: "Mares only",
    mares: "Mares only",
    "fillies-and-mares": "Fillies & Mares only",
    "colts-and-fillies": "Colts & Fillies only",
  };

  const lowerGender = gender.toLowerCase();
  return genderMap[lowerGender] || `${gender} only`;
}

/**
 * Format all restrictions for display.
 *
 * Combines age and gender restrictions into a single formatted string,
 * separated by " · ".
 *
 * @param restrictions - Race restrictions object
 * @returns Combined formatted restriction string
 *
 * @example
 * const allStr = formatAllRestrictions({ minAge: 2, gender: "colt" });
 * // Returns "2+ YO · Colts only"
 */
export function formatAllRestrictions(restrictions?: Race["restrictions"]): string {
  const parts: string[] = [];

  const ageStr = formatAgeRestrictions(restrictions);
  if (ageStr) {
    parts.push(ageStr);
  }

  const genderStr = formatGenderRestriction(restrictions?.gender);
  if (genderStr) {
    parts.push(genderStr);
  }

  return parts.join(" · ");
}
