import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useGame } from "@/game/store";
import { type Grade } from "@/game/gradedRaces";
import { getGradeColorClass } from "@/core/race/grading";
import { getMonthName, formatDate } from "@/core/calendar/dateFormatting";

const TRIPLE_CROWN_KEYS = new Set([
  "ca-kings-plate",
  "ca-prince-of-wales",
  "ca-breeders-stakes",
]);

const CANADIAN_TRACKS = new Set([
  "Woodbine",
  "Fort Erie",
  "Century Mile",
  "Hastings",
]);

export const Route = createFileRoute("/canadian-calendar")({
  component: CanadianCalendarPage,
});

function CanadianCalendarPage() {
  const [gradeFilter, setGradeFilter] = useState<Grade | "all">("all");
  const [tripleCrownFilter, setTripleCrownFilter] = useState<boolean | "all">("all");
  const races = useGame((s) => s.races);

  const canadianRaces = races.filter((race) =>
    race.graded && CANADIAN_TRACKS.has(race.graded.track)
  );

  const filteredRaces = canadianRaces.filter((race) => {
    if (gradeFilter !== "all" && race.graded?.grade !== gradeFilter) return false;
    if (tripleCrownFilter !== "all") {
      const isTripleCrown = TRIPLE_CROWN_KEYS.has(race.graded?.key ?? "");
      if (tripleCrownFilter && !isTripleCrown) return false;
      if (!tripleCrownFilter && isTripleCrown) return false;
    }
    return true;
  });

  // Group races by month
  const racesByMonth = filteredRaces.reduce((acc, race) => {
    const dayOfYear = ((race.day - 1) % 365) + 1;
    const monthName = getMonthName(dayOfYear);
    if (!acc[monthName]) acc[monthName] = [];
    acc[monthName].push(race);
    return acc;
  }, {} as Record<string, typeof filteredRaces>);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Canadian Flat Racing Calendar</h1>
        <p className="text-muted-foreground">Grade 1, 2, and 3 stakes races across Canada</p>
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
              <span className="text-sm font-medium">Triple Crown:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={tripleCrownFilter === "all" ? "default" : "outline"}
                  onClick={() => setTripleCrownFilter("all")}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={tripleCrownFilter === true ? "default" : "outline"}
                  onClick={() => setTripleCrownFilter(true)}
                >
                  Only
                </Button>
                <Button
                  size="sm"
                  variant={tripleCrownFilter === false ? "default" : "outline"}
                  onClick={() => setTripleCrownFilter(false)}
                >
                  Exclude
                </Button>
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
                const isTripleCrown = TRIPLE_CROWN_KEYS.has(race.graded?.key ?? "");
                const hasOwnedEntry = race.entries.some((e) => e.owned);
                return (
                  <div
                    key={race.id}
                    className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${
                      isTripleCrown ? "border-l-4 border-l-fame bg-fame/10" : hasOwnedEntry ? "border-l-4 border-l-success bg-success/10" : ""
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
                        {isTripleCrown && (
                          <Badge className="bg-fame/20 text-fame border-fame/40">
                            Triple Crown
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
                        {race.restrictions?.gender && (
                          <span>{race.restrictions.gender === "filly" ? "Fillies" : "Colts"} only</span>
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

