import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGradeColorClass } from "@/core/race/grading";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { GradedStatsChart } from "@/components/GradedStatsChart";

interface GradedHistoryEntry {
  raceName: string;
  position: number;
  day: number;
  beyer?: number;
  grade?: "G1" | "G2" | "G3";
  distance?: number;
  surface?: string;
  fieldSize?: number;
}

interface GradedHistoryPanelProps {
  history: GradedHistoryEntry[];
}

export function GradedHistoryPanel({ history }: GradedHistoryPanelProps) {
  const graded = history.filter((r) => r.grade);
  const byGrade = {
    G1: graded.filter((r) => r.grade === "G1"),
    G2: graded.filter((r) => r.grade === "G2"),
    G3: graded.filter((r) => r.grade === "G3"),
  };
  const wins = (rs: typeof graded) => rs.filter((r) => r.position === 1).length;
  const places = (rs: typeof graded) => rs.filter((r) => r.position <= 3).length;
  const bestBeyer = (rs: typeof graded) =>
    rs.reduce((m, r) => (typeof r.beyer === "number" && r.beyer > m ? r.beyer : m), 0);

  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle>Graded race history</CardTitle>
        <p className="text-xs text-cream-muted">G1/G2/G3 finishes with Beyer figures earned</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {graded.length > 0 && (
          <GradedStatsChart
            data={[
              {
                grade: "G1",
                runs: byGrade.G1.length,
                wins: wins(byGrade.G1),
                places: places(byGrade.G1),
              },
              {
                grade: "G2",
                runs: byGrade.G2.length,
                wins: wins(byGrade.G2),
                places: places(byGrade.G2),
              },
              {
                grade: "G3",
                runs: byGrade.G3.length,
                wins: wins(byGrade.G3),
                places: places(byGrade.G3),
              },
            ]}
          />
        )}

        <div className="grid grid-cols-3 gap-2">
          {(["G1", "G2", "G3"] as const).map((g) => (
            <div key={g} className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className={getGradeColorClass(g)}>
                  {g}
                </Badge>
                <span className="text-xs text-cream-muted">
                  {byGrade[g].length} run{byGrade[g].length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-semibold">{wins(byGrade[g])}</span>
                <span className="text-cream-muted"> wins · </span>
                <span className="font-semibold">{places(byGrade[g])}</span>
                <span className="text-cream-muted"> placed</span>
              </div>
              <div className="text-xs text-cream-muted mt-1">
                Best Beyer:{" "}
                <span className="font-medium text-cream">{bestBeyer(byGrade[g]) || "—"}</span>
              </div>
            </div>
          ))}
        </div>

        {graded.length === 0 ? (
          <p className="text-sm text-cream-muted">No graded stakes appearances yet.</p>
        ) : (
          <div className="space-y-1">
            {graded.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 text-sm py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {r.grade && (
                    <Badge variant="outline" className={getGradeColorClass(r.grade)}>
                      {r.grade}
                    </Badge>
                  )}
                  <div className="min-w-0">
                    <div className="truncate">{r.raceName}</div>
                    <div className="text-xs text-cream-muted">
                      {r.distance ? `${r.distance}m` : ""}
                      {r.surface ? ` · ${r.surface}` : ""}
                      {r.fieldSize ? ` · field of ${r.fieldSize}` : ""} · D{r.day}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {typeof r.beyer === "number" && (
                    <span className="text-xs">
                      <span className="text-cream-muted">Beyer </span>
                      <span className="font-semibold">{r.beyer}</span>
                    </span>
                  )}
                  <Badge
                    variant={
                      r.position === 1 ? "default" : r.position <= 3 ? "secondary" : "outline"
                    }
                  >
                    {r.position}
                    {getOrdinalSuffix(r.position)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
