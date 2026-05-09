import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BeyerBadge } from "@/components/BeyerBadge";
import { calculateBeyerForResult } from "@/game/beyer";
import { getGradeColorClass } from "@/core/race/grading";
import { calculateClassBonus } from "@/core/common/classBonus";
import { Trophy, Medal, Award } from "lucide-react";
import { NumericValue } from "@/components/HorseBits";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recap")({
  component: RecapPage,
});

function RecapPage() {
  const races = useGame((s) => s.races);
  const horses = useGame((s) => s.horses);
  const calibratedPars = useGame((s) => s.calibratedPars);
  const day = useGame((s) => s.day);

  // Get resolved graded races from the past 7 days
  const weekAgo = day - 7;
  const recentGradedRaces = races
    .filter(
      (r) =>
        r.resolved &&
        r.graded &&
        r.result &&
        r.result.length > 0 &&
        r.day >= weekAgo &&
        r.day <= day,
    )
    .sort((a, b) => {
      // Sort by grade first (G1 > G2 > G3), then by day (most recent first)
      const gradeOrder = { G1: 3, G2: 2, G3: 1 };
      const gradeDiff = gradeOrder[b.graded!.grade] - gradeOrder[a.graded!.grade];
      if (gradeDiff !== 0) return gradeDiff;
      return b.day - a.day;
    })
    .slice(0, 12); // Show top 12 most important races

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Weekly Recap
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Highlights from the past week's graded stakes
        </p>
      </div>

      {recentGradedRaces.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="p-8 text-center text-cream-muted italic font-[family-name:var(--font-body)]">
            No graded races completed in the past 7 days. Check back after the weekend stakes have
            been run!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {recentGradedRaces.map((race) => {
            const gradeColor = getGradeColorClass(race.graded!.grade);

            // Get top 3 finishers with their Beyer figures
            const topFinishers = race
              .result!.slice(0, 3)
              .map((result) => {
                const horse = horses.find((h) => h.id === result.horseId);
                if (!horse) return null;
                const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);
                const beyer = calculateBeyerForResult(
                  race.distance,
                  result.time,
                  classBonus,
                  calibratedPars,
                );
                return { horse, result, beyer };
              })
              .filter((f): f is NonNullable<typeof f> => f !== null);

            return (
              <Card key={race.id} className="border-l-4 border-l-gold border-gold-muted">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold font-[family-name:var(--font-display)]">
                          {race.name}
                        </h3>
                        <Badge className={cn(gradeColor, "font-[family-name:var(--font-mono)]")}>
                          {race.graded!.grade}
                        </Badge>
                        <Badge className="bg-t700 text-cream font-[family-name:var(--font-mono)] tabular-nums">
                          Day <NumericValue value={race.day} />
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-cream-muted font-[family-name:var(--font-body)]">
                        <span>{race.graded!.track}</span>
                        <span>
                          <NumericValue value={race.distance} suffix="m" />
                        </span>
                        <span>{race.graded!.surface}</span>
                        <span className="font-[family-name:var(--font-mono)] tabular-nums">
                          Purse ${race.purse.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topFinishers.map((finisher, index) => {
                    const positionIcon =
                      index === 0 ? (
                        <Trophy className="h-4 w-4 text-fame" />
                      ) : index === 1 ? (
                        <Medal className="h-4 w-4 text-cream-muted" />
                      ) : (
                        <Award className="h-4 w-4 text-warning" />
                      );

                    return (
                      <div
                        key={finisher.horse.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-t700"
                      >
                        <div className="flex items-center gap-3">
                          {positionIcon}
                          <SilkDot color={finisher.horse.silk} size="sm" />
                          <div>
                            <Link
                              to="/stable/$horseId"
                              params={{ horseId: finisher.horse.id }}
                              className="font-medium font-[family-name:var(--font-display)] text-cream hover:underline hover:text-gold"
                            >
                              {finisher.horse.name}
                            </Link>
                            <div className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                              <NumericValue
                                value={finisher.result.time}
                                suffix="s"
                                className="font-[family-name:var(--font-mono)] tabular-nums"
                              />{" "}
                              · <NumericValue value={finisher.horse.age} suffix="YO" /> · OVR{" "}
                              <NumericValue
                                value={Math.round(
                                  (finisher.horse.stats.speed +
                                    finisher.horse.stats.stamina +
                                    finisher.horse.stats.acceleration +
                                    finisher.horse.stats.consistency) /
                                    4,
                                )}
                              />
                            </div>
                          </div>
                        </div>
                        <BeyerBadge beyer={finisher.beyer} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
