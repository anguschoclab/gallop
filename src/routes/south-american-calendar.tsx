import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { GRADED_RACES, type Grade } from "@/game/gradedRaces";
import { getGradeColorClass } from "@/core/race/grading";
import {
  getMonthName as coreGetMonthName,
  formatDate as coreFormatDate,
} from "@/core/calendar/dateFormatting";

const SOUTH_AMERICAN_TRACKS = new Set([
  "Hipódromo de San Isidro",
  "Hipódromo Argentino de Palermo",
  "Hipódromo de La Plata",
  "Hipódromo da Gávea",
  "Hipódromo Cidade Jardim",
  "Valparaiso Sporting Club",
  "Hipódromo Chile",
  "Club Hípico de Santiago",
]);

export const Route = createFileRoute("/south-american-calendar")({
  component: SouthAmericanCalendarPage,
});

function SouthAmericanCalendarPage() {
  const [gradeFilter, setGradeFilter] = useState<Grade | "all">("all");

  const southAmericanRaces = GRADED_RACES.filter((race) => SOUTH_AMERICAN_TRACKS.has(race.track));

  const filteredRaces = southAmericanRaces.filter((race) => {
    if (gradeFilter !== "all" && race.grade !== gradeFilter) return false;
    return true;
  });

  // Group races by month
  const racesByMonth = filteredRaces.reduce(
    (acc, race) => {
      const monthName = coreGetMonthName(race.dayOfYear);
      if (!acc[monthName]) acc[monthName] = [];
      acc[monthName].push(race);
      return acc;
    },
    {} as Record<string, typeof filteredRaces>,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">South American Racing Calendar</h1>
        <p className="text-muted-foreground">
          Grade 1, 2, and 3 stakes races across Argentina, Brazil, and Chile
        </p>
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
              .sort((a, b) => a.dayOfYear - b.dayOfYear)
              .map((race) => (
                <div
                  key={race.key}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{race.name}</h3>
                      <Badge variant="outline" className={getGradeColorClass(race.grade)}>
                        {race.grade}
                      </Badge>
                      {race.note && <Badge variant="secondary">{race.note}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{race.track}</span>
                      <span>{race.distance}m</span>
                      <span>{race.surface}</span>
                      <span>
                        Purse{" "}
                        <span className="font-medium text-foreground">
                          ${race.purse.toLocaleString()}
                        </span>
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
                        <span>
                          {race.restrictions.gender === "filly" ? "Fillies" : "Colts"} only
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{coreFormatDate(race.dayOfYear)}</div>
                  </div>
                </div>
              ))}
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
