import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { getTrackContinent, getTrackCountry, type Continent } from "@/game/gradedRaces";
import { groupRacesByDate } from "@/lib/utils";

interface RegionalScheduleProps {
  continent?: Continent;
  country?: string;
  tracks?: string[];
  title: string;
}

function formatDate(day: number): string {
  const dayOfYear = ((day - 1) % 365) + 1;
  const date = new Date(2024, 0, dayOfYear);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RegionalSchedule({ continent, country, tracks, title }: RegionalScheduleProps) {
  const races = useGame((s) => s.races);
  const day = useGame((s) => s.day);

  // Filter races based on the provided criteria
  const filteredRaces = races.filter(
    (r) =>
      !r.resolved &&
      r.day >= day &&
      r.graded &&
      (continent ? getTrackContinent(r.graded.track) === continent : true) &&
      (country ? getTrackCountry(r.graded.track) === country : true) &&
      (tracks ? tracks.includes(r.graded.track) : true)
  );

  // Group races by track if specific tracks provided, otherwise by date
  if (tracks && tracks.length > 0) {
    const racesByTrack = new Map<string, any[]>();
    for (const track of tracks) {
      racesByTrack.set(
        track,
        filteredRaces.filter((r) => r.graded?.track === track)
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={tracks[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {tracks.map((track) => (
                <TabsTrigger key={track} value={track} className="text-sm">
                  {track}
                </TabsTrigger>
              ))}
            </TabsList>
            {tracks.map((track) => {
              const trackRaces = racesByTrack.get(track) || [];
              const groupedRaces = groupRacesByDate(trackRaces);

              return (
                <TabsContent key={track} value={track} className="mt-4">
                  {groupedRaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No upcoming races scheduled at {track}
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
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // No specific tracks - show all races grouped by date
  const groupedRaces = groupRacesByDate(filteredRaces);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {groupedRaces.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No upcoming races scheduled
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
      </CardContent>
    </Card>
  );
}
