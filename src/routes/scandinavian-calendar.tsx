import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useGame } from "@/game/store";
import { type Grade } from "@/game/gradedRaces";
import { getGradeColorClass } from "@/core/race/grading";
import { getMonthName as coreGetMonthName } from "@/core/calendar/dateFormatting";

const SCANDINAVIAN_TRACKS = new Set([
  "Bro Park",
  "Øvrevoll",
  "Klampenborg",
]);

export const Route = createFileRoute("/scandinavian-calendar")({
  component: ScandinavianCalendarPage,
});

function ScandinavianCalendarPage() {
  const [gradeFilter, setGradeFilter] = useState<Grade | "all">("all");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const races = useGame((s) => s.races);

  const scandinavianRaces = races.filter((race) =>
    race.graded && SCANDINAVIAN_TRACKS.has(race.graded.track)
  );

  const tracks = Array.from(new Set(scandinavianRaces.map((r) => r.graded?.track))).filter((t): t is string => Boolean(t)).sort();

  const filteredRaces = scandinavianRaces.filter((race) => {
    if (gradeFilter !== "all" && race.graded?.grade !== gradeFilter) return false;
    if (trackFilter !== "all" && race.graded?.track !== trackFilter) return false;
    return true;
  });

  // Group races by month
  const racesByMonth = filteredRaces.reduce((acc, race) => {
    const dayOfYear = ((race.day - 1) % 365) + 1;
    const monthName = coreGetMonthName(dayOfYear);
    if (!acc[monthName]) acc[monthName] = [];
    acc[monthName].push(race);
    return acc;
  }, {} as Record<string, typeof filteredRaces>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scandinavian Racing Calendar</h1>
        <p className="text-muted-foreground">Grade 1, 2, and 3 stakes races across Scandinavia</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Grade:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={gradeFilter === "all" ? "default" : "outline"}
                  onClick={() => setGradeFilter("all")}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={gradeFilter === "G1" ? "default" : "outline"}
                  onClick={() => setGradeFilter("G1")}
                >
                  G1
                </Button>
                <Button
                  size="sm"
                  variant={gradeFilter === "G2" ? "default" : "outline"}
                  onClick={() => setGradeFilter("G2")}
                >
                  G2
                </Button>
                <Button
                  size="sm"
                  variant={gradeFilter === "G3" ? "default" : "outline"}
                  onClick={() => setGradeFilter("G3")}
                >
                  G3
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Racecourse:</span>
              <div className="flex gap-1 flex-wrap">
                <Button
                  size="sm"
                  variant={trackFilter === "all" ? "default" : "outline"}
                  onClick={() => setTrackFilter("all")}
                >
                  All
                </Button>
                {tracks.map((track) => (
                  <Button
                    key={track}
                    size="sm"
                    variant={trackFilter === track ? "default" : "outline"}
                    onClick={() => setTrackFilter(track)}
                  >
                    {track}
                  </Button>
                ))}
              </div>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {filteredRaces.length} race{filteredRaces.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar by month */}
      {Object.entries(racesByMonth).map(([month, races]) => (
        <Card key={month}>
          <CardHeader>
            <CardTitle className="text-xl">{month}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {races
              .sort((a, b) => a.day - b.day)
              .map((race) => {
                const hasOwnedEntry = race.entries.some((e) => e.owned);
                return (
                  <div
                    key={race.id}
                    className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${
                      hasOwnedEntry ? "border-l-4 border-l-success bg-success/10" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold">{race.name}</h3>
                        {race.graded?.grade && (
                          <Badge variant="outline" className={getGradeColorClass(race.graded.grade)}>
                            {race.graded.grade}
                          </Badge>
                        )}
                        {hasOwnedEntry && (
                          <Badge className="bg-success text-success-foreground">Entered</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{race.graded?.track}</span>
                        <span>{race.distance}m</span>
                        <span>{race.graded?.surface}</span>
                        <span>
                          Purse <span className="font-medium text-foreground">${race.purse.toLocaleString()}</span>
                        </span>
                        {race.restrictions?.minAge !== undefined && (
                          <span>
                            {race.restrictions.minAge === race.restrictions.maxAge
                              ? `${race.restrictions.minAge}YO only`
                              : race.restrictions.maxAge
                              ? `${race.restrictions.minAge}-${race.restrictions.maxAge}YO`
                              : `${race.restrictions.minAge}+ YO`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">Day {race.day}</div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}

      {filteredRaces.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No races match the selected filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
