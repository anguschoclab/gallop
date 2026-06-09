import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMonthName } from "@/core/calendar/dateFormatting";
import { CalendarRaceItem } from "./CalendarRaceItem";
import type { Race } from "@/game/types";
import type { RegionConfig } from "@/core/calendar/regions";

interface MonthViewProps {
  races: Race[];
  region: RegionConfig;
  currentDay: number;
}

export function MonthView({ races, region, currentDay }: MonthViewProps) {
  const racesByMonth = races.reduce(
    (acc, race) => {
      const dayOfYear = ((race.day - 1) % 365) + 1;
      const monthName = getMonthName(dayOfYear);
      if (!acc[monthName]) acc[monthName] = [];
      acc[monthName].push(race);
      return acc;
    },
    {} as Record<string, Race[]>,
  );

  return (
    <>
      {Object.entries(racesByMonth).map(([month, monthRaces]) => (
        <Card key={month}>
          <CardHeader>
            <CardTitle className="text-xl">{month}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {monthRaces
              .sort((a, b) => a.day - b.day)
              .map((race) => (
                <CalendarRaceItem key={race.id} race={race} region={region} />
              ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
