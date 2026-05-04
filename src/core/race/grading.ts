import type { Grade } from "@/game/gradedRaces";

/**
 * Pure grade color calculation
 * Returns the Tailwind CSS class string for a given grade
 * Extracted from: races.tsx, stable.$horseId.tsx, track-schedule.tsx, canadian-calendar.tsx,
 *                 uae-calendar.tsx, south-american-calendar.tsx, german-calendar.tsx,
 *                 scandinavian-calendar.tsx, recap.tsx
 */
export function getGradeColorClass(grade: Grade): string {
  const gradeColorMap: Record<Grade, string> = {
    G1: "bg-yellow-500/20 text-yellow-700 border-yellow-500/40",
    G2: "bg-slate-400/20 text-slate-600 border-slate-400/40",
    G3: "bg-amber-700/20 text-amber-800 border-amber-700/40",
  };
  return gradeColorMap[grade];
}
