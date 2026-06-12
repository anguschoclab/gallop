import { Badge } from "@/components/ui/badge";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { gradeColor } from "@/core/common/uiTokens";
import type { Race } from "@/game/types";
import type { RegionConfig } from "@/core/calendar/regions";

interface CalendarRaceItemProps {
  race: Race;
  region: RegionConfig;
}

export function CalendarRaceItem({ race, region }: CalendarRaceItemProps) {
  const isSpecial = region.specialRaceKeys?.has(race.graded?.key ?? "");
  const hasOwnedEntry = race.entries.some((e) => e.owned);

  return (
    <div
      className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${
        isSpecial
          ? "border-l-4 border-l-fame bg-fame/10"
          : hasOwnedEntry
            ? "border-l-4 border-l-success bg-success/10"
            : ""
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-semibold">{race.name}</h3>
          {race.graded?.grade && (
            <Badge variant="outline" className={gradeColor(race.graded.grade)}>
              {race.graded.grade}
            </Badge>
          )}
          {isSpecial && region.specialFilterName && (
            <Badge className="bg-fame/20 text-fame border-fame/40">
              {region.specialFilterName}
            </Badge>
          )}
          {hasOwnedEntry && (
            <Badge className="bg-success text-success-foreground">Entered</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-cream-muted">
          <span>{race.graded?.track}</span>
          <span>{race.distance}m</span>
          <span>{race.graded?.surface}</span>
          <span>
            Purse <span className="font-medium text-cream">${race.purse.toLocaleString()}</span>
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
        <div className="mt-2">
          <WeatherForecastStrip
            trackId={race.graded?.trackId ?? race.trackId}
            trackCondition={race.trackCondition}
          />
        </div>
      </div>
      <div className="text-right text-sm">
        <div className="font-medium">Day {race.day}</div>
      </div>
    </div>
  );
}
