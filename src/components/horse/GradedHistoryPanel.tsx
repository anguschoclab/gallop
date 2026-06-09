import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { Badge } from "@/components/ui/badge";
import { getGradeColorClass } from "@/core/race/grading";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { GradedStatsChart } from "@/components/race/GradedStatsChart";
import { GRADED_RACES, getRaceCountry } from "@/data/gradedRaces";
import { getCountryFlag } from "@/lib/countryFlag";
import { VisualTrophy, TrophyShelf } from "@/components/awards/VisualTrophy";

interface GradedHistoryEntry {
  raceId?: string;
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

  // Lookup race country by raceId (uuid) or by exact name match.
  const raceCountryByKey = useMemo(() => {
    const byId = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const race of GRADED_RACES) {
      const country = getRaceCountry(race);
      if (race.uuid) byId.set(race.uuid, country);
      if (race.name) byName.set(race.name, country);
    }
    return { byId, byName };
  }, []);

  const countryFor = (r: GradedHistoryEntry): string | undefined => {
    if (r.raceId && raceCountryByKey.byId.has(r.raceId)) return raceCountryByKey.byId.get(r.raceId);
    return raceCountryByKey.byName.get(r.raceName);
  };

  const yearFor = (day: number) => Math.floor((day - 1) / 365) + 1;

  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle>
          <JargonTooltip term="Graded race">Graded race</JargonTooltip> history
        </CardTitle>
        <p className="text-xs text-cream-muted">
          G1/G2/G3 finishes with <JargonTooltip term="Beyer">Beyer</JargonTooltip> figures earned
        </p>
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

        {/* Visual G1 trophy shelf — one cup per G1 victory */}
        {(() => {
          const g1Wins = byGrade.G1.filter((r) => r.position === 1);
          if (g1Wins.length === 0) return null;
          return (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-cream-muted">
                G1 Trophy Shelf · {g1Wins.length}
              </div>
              <TrophyShelf count={g1Wins.length}>
                {g1Wins.map((r, i) => {
                  const country = countryFor(r);
                  return (
                    <VisualTrophy
                      key={`g1-trophy-${i}`}
                      tone="gold"
                      size={64}
                      label="G1"
                      sublabel={`Y${yearFor(r.day)}`}
                      flag={getCountryFlag(country)}
                      title={`${r.raceName} — ${country ?? "Unknown"} · Y${yearFor(r.day)}`}
                    />
                  );
                })}
              </TrophyShelf>
            </div>
          );
        })()}

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
                <JargonTooltip term="Beyer">Best Beyer</JargonTooltip>:{" "}
                <span className="font-medium text-cream">{bestBeyer(byGrade[g]) || "—"}</span>
              </div>
            </div>
          ))}
        </div>

        {graded.length === 0 ? (
          <p className="text-sm text-cream-muted">No graded stakes appearances yet.</p>
        ) : (
          <div className="space-y-1">
            {graded.map((r, i) => {
              const country = countryFor(r);
              const flag = r.grade === "G1" ? getCountryFlag(country) : null;
              return (
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
                      <div className="text-xs text-cream-muted flex items-center gap-1.5">
                        {flag && (
                          <span
                            title={country ?? "Unknown country"}
                            className="text-sm leading-none"
                          >
                            {flag}
                          </span>
                        )}
                        {r.grade === "G1" && (
                          <span className="tabular-nums">Y{yearFor(r.day)}</span>
                        )}
                        {r.distance ? <span>· {r.distance}m</span> : null}
                        {r.surface ? <span>· {r.surface}</span> : null}
                        {r.fieldSize ? <span>· field of {r.fieldSize}</span> : null}
                        <span>· D{r.day}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {typeof r.beyer === "number" && (
                      <span className="text-xs">
                        <span className="text-cream-muted">
                          <JargonTooltip term="Beyer">Beyer</JargonTooltip>{" "}
                        </span>
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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
