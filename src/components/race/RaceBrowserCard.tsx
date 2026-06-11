import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import { gradeColor } from "@/lib/uiTokens";
import { getCountry } from "@/data/gradedRaces";
import type { Race } from "@/game/types";

interface Props {
  race: Race;
}

export function RaceBrowserCard({ race }: Props) {
  const hasOwnedEntry = race.entries.some((e) => e.owned);

  return (
    <Card
      className={`border-l-4 border-gold-muted ${hasOwnedEntry ? "border-l-success bg-success/10" : "border-l-gold"}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-bold text-cream font-[family-name:var(--font-display)]">
                {race.name}
              </h3>
              {race.graded?.grade && (
                <Badge variant="outline" className={gradeColor(race.graded.grade)}>
                  {race.graded.grade}
                </Badge>
              )}
              {hasOwnedEntry && <Badge className="bg-success text-t950">Entered</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-cream-muted">
              <span className="font-medium text-cream">{race.graded?.track}</span>
              <span>· {race.graded && getCountry(race.graded.track)}</span>
              <span>· {race.distance}m</span>
              <span>· {race.graded?.surface}</span>
              <span>· Day {race.day}</span>
              <span>
                · Purse{" "}
                <span className="font-medium text-cream">
                  ${race.purse.toLocaleString()}
                </span>
              </span>
            </div>
            <div className="mt-2">
              <WeatherForecastStrip
                trackId={race.graded?.trackId ?? race.trackId}
                trackCondition={race.trackCondition}
              />
            </div>
            {race.restrictions && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {race.restrictions.minAge !== undefined &&
                  race.restrictions.maxAge !== undefined && (
                    <Badge variant="outline" className="text-xs border-gold-muted text-cream">
                      {race.restrictions.minAge}-{race.restrictions.maxAge}YO
                    </Badge>
                  )}
                {race.restrictions.minAge !== undefined &&
                  race.restrictions.maxAge === undefined && (
                    <Badge variant="outline" className="text-xs border-gold-muted text-cream">
                      {race.restrictions.minAge}+ YO
                    </Badge>
                  )}
                {race.restrictions.gender && (
                  <Badge variant="outline" className="text-xs border-gold-muted text-cream">
                    {race.restrictions.gender}
                  </Badge>
                )}
                {race.restrictions.minAgeNorthern !== undefined && (
                  <Badge variant="outline" className="text-xs border-gold-muted text-cream">
                    {race.restrictions.minAgeNorthern}+ YO (Northern)
                  </Badge>
                )}
                {race.restrictions.minAgeSouthern !== undefined && (
                  <Badge variant="outline" className="text-xs border-gold-muted text-cream">
                    {race.restrictions.minAgeSouthern}+ YO (Southern)
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
