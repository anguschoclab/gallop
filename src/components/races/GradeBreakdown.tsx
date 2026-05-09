import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getGradeColorClass } from "@/core/race/grading";
import type { Race, Horse } from "@/game/types";

interface GradeBreakdownProps {
  races: Race[];
  horses: Horse[];
  day: number;
}

export function GradeBreakdown({ races, horses, day }: GradeBreakdownProps) {
  const { gradeData, avgBeyer } = useMemo(() => {
    const upcoming = races.filter((r) => !r.resolved && r.day >= day);
    const grades = ["G1", "G2", "G3"] as const;

    const horseMap = new Map(horses.map((h) => [h.id, h]));

    const gradeData = grades.map((grade) => {
      const gradeRaces = upcoming.filter((r) => r.graded?.grade === grade);
      const ownedEntries = gradeRaces.filter((r) => r.entries.some((e) => e.owned));

      let topProj: { name: string; proj: number } | null = null;
      const allOwnedProjs: number[] = [];

      for (const r of ownedEntries) {
        for (const entry of r.entries) {
          if (!entry.owned) continue;

          const horse = horseMap.get(entry.horseId);
          if (horse) {
            const proj = horse.stats.speed + horse.stats.acceleration; // Simple proj Beyer
            allOwnedProjs.push(proj);
            if (!topProj || proj > topProj.proj) {
              topProj = { name: horse.name, proj };
            }
          }
        }
      }

      return {
        grade,
        total: gradeRaces.length,
        ownedCount: ownedEntries.length,
        topOwned: topProj,
        allOwnedProjs,
      };
    });

    const allOwnedProjs = gradeData.flatMap((d) => d.allOwnedProjs);
    let avgBeyer = null;
    if (allOwnedProjs.length > 0) {
      avgBeyer = Math.round(allOwnedProjs.reduce((s, v) => s + v, 0) / allOwnedProjs.length);
    }

    return { gradeData, avgBeyer };
  }, [races, horses, day]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {gradeData.map(({ grade, total, ownedCount, topOwned }) => (
            <div key={grade} className="space-y-2">
              <div
                className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${getGradeColorClass(grade)}`}
              >
                {grade}
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{total}</div>
                <div className="text-xs text-muted-foreground">races upcoming</div>
              </div>
              <div>
                <div
                  className={`text-sm font-semibold tabular-nums ${ownedCount > 0 ? "text-success" : "text-muted-foreground"}`}
                >
                  {ownedCount} entered
                </div>
                <div className="text-xs text-muted-foreground">owned entries</div>
              </div>
              <div>
                {topOwned ? (
                  <>
                    <div className="text-sm font-semibold truncate">{topOwned.name}</div>
                    <div className="text-xs text-muted-foreground">
                      top proj. ~{topOwned.proj} Beyer
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Avg Beyer (owned entries):</span>
          <span className="text-sm font-bold tabular-nums">{avgBeyer ?? "—"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
