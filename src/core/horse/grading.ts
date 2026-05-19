/**
 * grading.ts - Letter grade conversion for horse stats
 */

export type LetterGrade = "S" | "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

/**
 * Convert a numeric stat (0-100) to a scout letter grade.
 *
 * @param stat - Numeric value from 0-100
 * @returns Letter grade representation
 */
export function scoutGrade(stat: number): LetterGrade {
  if (stat >= 95) return "S";
  if (stat >= 90) return "A+";
  if (stat >= 80) return "A";
  if (stat >= 70) return "B+";
  if (stat >= 60) return "B";
  if (stat >= 50) return "C+";
  if (stat >= 40) return "C";
  if (stat >= 20) return "D";
  return "F";
}

/**
 * Get CSS color class for a letter grade.
 */
export function gradeColorClass(grade: LetterGrade): string {
  switch (grade) {
    case "S":
      return "text-fame font-black animate-pulse";
    case "A+":
    case "A":
      return "text-gold font-bold";
    case "B+":
    case "B":
      return "text-success font-medium";
    case "C+":
    case "C":
      return "text-warning";
    case "D":
      return "text-destructive/80";
    default:
      return "text-cream/20 italic";
  }
}
