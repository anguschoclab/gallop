/**
 * grading.ts - Grade color calculation for UI
 *
 * This file provides Tailwind CSS class strings for race grades.
 * Uses app theme colors for UI consistency: G1 = fame (gold), G2 = muted-foreground (silver),
 * G3 = info (bronze).
 *
 * Dependencies: @/game/gradedRaces (Grade)
 * Related files: Used throughout UI components for displaying grade badges
 */

import type { Grade } from "@/data/gradedRaces";

/**
 * Pure grade color calculation.
 *
 * Returns the Tailwind CSS class string for a given grade.
 * Uses app theme colors for UI consistency (Decision 0008 in design bible).
 * G1 = fame (gold/celebratory), G2 = muted-foreground (silver/secondary), G3 = info (bronze/tertiary).
 *
 * @param grade - The race grade
 * @returns Tailwind CSS class string
 *
 * @example
 * const className = getGradeColorClass("G1");
 * // Returns "text-fame border-fame/40 bg-fame/10"
 */
export function getGradeColorClass(grade: Grade): string {
  const gradeColorMap: Record<Grade, string> = {
    G1: "text-fame border-fame/40 bg-fame/10",
    G2: "text-muted-foreground border-muted-foreground/40 bg-muted-foreground/10",
    G3: "text-info border-info/40 bg-info/10",
  };
  return gradeColorMap[grade];
}
