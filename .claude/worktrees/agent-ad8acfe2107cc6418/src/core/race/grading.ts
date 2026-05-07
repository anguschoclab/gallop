import type { Grade } from "@/game/gradedRaces";

/**
 * Pure grade color calculation
 * Returns the Tailwind CSS class string for a given grade
 * Uses app theme colors for UI consistency (Decision 0008 in design bible)
 * G1 = fame (gold/celebratory), G2 = muted-foreground (silver/secondary), G3 = info (bronze/tertiary)
 * Extracted from: races.tsx, stable.$horseId.tsx, track-schedule.tsx, canadian-calendar.tsx,
 *                 uae-calendar.tsx, south-american-calendar.tsx, german-calendar.tsx,
 *                 scandinavian-calendar.tsx, recap.tsx
 */
export function getGradeColorClass(grade: Grade): string {
  const gradeColorMap: Record<Grade, string> = {
    G1: "text-fame border-fame/40 bg-fame/10",
    G2: "text-muted-foreground border-muted-foreground/40 bg-muted-foreground/10",
    G3: "text-info border-info/40 bg-info/10",
  };
  return gradeColorMap[grade];
}
