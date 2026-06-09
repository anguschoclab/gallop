import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRaceItem } from "./CalendarRaceItem";
import type { Race } from "@/game/types";
import type { RegionConfig } from "@/core/calendar/regions";

interface TrackViewProps {
  races: Race[];
  region: RegionConfig;
  currentDay: number;
}

export function TrackView({ races, region }: TrackViewProps) {
  const racesByTrack = region.tracks.reduce(
    (acc, track) => {
      const trackRaces = races.filter((r) => r.graded?.track === track);
      if (trackRaces.length > 0) {
        acc[track] = trackRaces.sort((a, b) => a.day - b.day);
      }
      return acc;
    },
    {} as Record<string, Race[]>,
  );

  return (
    <>
      {Object.entries(racesByTrack).map(([track, trackRaces]) => (
        <Card key={track}>
          <CardHeader>
            <CardTitle className="text-xl">{track}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trackRaces.map((race) => (
              <CalendarRaceItem key={race.id} race={race} region={region} />
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
