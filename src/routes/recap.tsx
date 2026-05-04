import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BeyerBadge } from "@/components/BeyerBadge";
import { calculateBeyerForResult } from "@/game/beyer";
import { getGradeColorClass } from "@/core/race/grading";
import { Trophy, Medal, Award } from "lucide-react";

export const Route = createFileRoute("/recap")({
  component: RecapPage,
});

function RecapPage() {
  const races = useGame((s) => s.races);
  const horses = useGame((s) => s.horses);
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
        <h1 className="text-3xl font-bold tracking-tight">Weekly Recap</h1>
        <p className="text-muted-foreground">Highlights from the past week's graded stakes</p>
      </div>

      {recentGradedRaces.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No graded races completed in the past 7 days. Check back after some races have been run!
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
                const classBonus = race.graded?.grade
                  ? race.graded.grade === "G1"
                    ? 8
                    : race.graded.grade === "G2"
                      ? 5
                      : 3
                  : 0;
                const beyer = calculateBeyerForResult(race.distance, result.time, classBonus);
                return { horse, result, beyer };
              })
              .filter((f): f is NonNullable<typeof f> => f !== null);

            return (
              <Card key={race.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold">{race.name}</h3>
                        <Badge variant="outline" className={gradeColor}>
                          {race.graded!.grade}
                        </Badge>
                        <Badge variant="secondary">Day {race.day}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{race.graded!.track}</span>
                        <span>{race.distance}m</span>
                        <span>{race.graded!.surface}</span>
                        <span>Purse ${race.purse.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topFinishers.map((finisher, index) => {
                    const positionIcon =
                      index === 0 ? (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      ) : index === 1 ? (
                        <Medal className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Award className="h-4 w-4 text-amber-600" />
                      );

                    return (
                      <div
                        key={finisher.horse.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {positionIcon}
                          <div>
                            <div className="font-medium">{finisher.horse.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {finisher.result.time.toFixed(2)}s · {finisher.horse.age}YO · OVR{" "}
                              {Math.round(
                                (finisher.horse.stats.speed +
                                  finisher.horse.stats.stamina +
                                  finisher.horse.stats.acceleration +
                                  finisher.horse.stats.consistency) /
                                  4,
                              )}
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
