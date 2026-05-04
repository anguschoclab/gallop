import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { groupRacesByDate } from "@/lib/utils";

const JAPANESE_TRACKS = ["Tokyo", "Kyoto", "Nakayama", "Hanshin"] as const;

type JapaneseTrack = typeof JAPANESE_TRACKS[number];

type Season = "all" | "early" | "mid" | "late";

function formatDate(day: number): string {
  const dayOfYear = ((day - 1) % 365) + 1;
  const date = new Date(2024, 0, dayOfYear);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getSeasonFromDay(day: number): Season {
  const dayOfYear = ((day - 1) % 365) + 1;
  if (dayOfYear >= 1 && dayOfYear <= 90) return "early";
  if (dayOfYear >= 91 && dayOfYear <= 180) return "mid";
  if (dayOfYear >= 181 && dayOfYear <= 270) return "late";
  return "early";
}

export function JapaneseSchedule() {
  const races = useGame((s) => s.races);
  const day = useGame((s) => s.day);
  const [selectedSeason, setSelectedSeason] = useState<Season>("all");

  // Filter for Japanese track races and upcoming races
  const japaneseRaces = races.filter(
    (r) =>
      !r.resolved &&
      r.day >= day &&
      r.graded &&
      JAPANESE_TRACKS.includes(r.graded.track as JapaneseTrack)
  );

  // Filter by season (inferred from dayOfYear)
  const seasonFilteredRaces = japaneseRaces.filter((race) => {
    if (selectedSeason === "all") return true;
    const dayOfYear = ((race.day - 1) % 365) + 1;
    const inferredSeason = getSeasonFromDay(dayOfYear);
    return inferredSeason === selectedSeason;
  });

  // Group races by date
  const groupedRaces = groupRacesByDate(seasonFilteredRaces);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Japanese Race Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={selectedSeason} onValueChange={(v) => setSelectedSeason(v as Season)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-sm">All Seasons</TabsTrigger>
            <TabsTrigger value="early" className="text-sm">Early (Jan-Mar)</TabsTrigger>
            <TabsTrigger value="mid" className="text-sm">Mid (Apr-Jun)</TabsTrigger>
            <TabsTrigger value="late" className="text-sm">Late (Jul-Sep)</TabsTrigger>
          </TabsList>
          <TabsContent value={selectedSeason} className="mt-4">
            {groupedRaces.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No upcoming Japanese races scheduled for this season
              </p>
            ) : (
              <div className="space-y-4">
                {groupedRaces.map(({ day, races: dayRaces }) => (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold">{formatDate(day)}</h4>
                      <Badge variant="outline" className="text-xs">
                        Day {day}
                      </Badge>
                    </div>
                    <div className="space-y-2 pl-2 border-l-2 border-muted">
                      {dayRaces.map((race) => {
                        const gradeColor =
                          race.graded?.grade === "G1"
                            ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/40"
                            : race.graded?.grade === "G2"
                            ? "bg-slate-400/20 text-slate-600 border-slate-400/40"
                            : "bg-amber-700/20 text-amber-800 border-amber-700/40";

                        return (
                          <div
                            key={race.id}
                            className="flex items-start justify-between gap-2 py-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{race.name}</span>
                                <Badge variant="outline" className={gradeColor}>
                                  {race.graded?.grade}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {race.graded?.track}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                <span>{race.distance}m</span>
                                <span>{race.graded?.surface}</span>
                                <span>
                                  Purse ${race.purse.toLocaleString()}
                                </span>
                                {race.restrictions?.minAge && (
                                  <span>{race.restrictions.minAge}+ YO</span>
                                )}
                                {race.restrictions?.sex && (
                                  <span>
                                    {race.restrictions.sex === "filly"
                                      ? "Fillies"
                                      : "Colts"}{" "}
                                    only
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
