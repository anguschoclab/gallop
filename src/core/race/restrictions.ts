import type { Race } from "@/game/types";

/**
 * Pure restriction formatting logic
 * Extracted from: RaceDetailPanel.tsx, calendar files
 */

/**
 * Format age restrictions for display
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
 * Format gender restriction for display
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
 * Format all restrictions for display
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
