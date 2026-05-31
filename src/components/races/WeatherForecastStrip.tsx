/**
 * WeatherForecastStrip.tsx — 7-day weather forecast strip + current condition chip.
 *
 * Pulls per-track weather from the store's weather slice (populated daily by
 * `weatherPhase`). Falls back to a single condition chip if no forecast exists.
 */

import { Sun, Cloud, CloudDrizzle, CloudRain, CloudLightning, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { useGame } from "@/game/store";
import type { SimWeatherPattern, WeatherState } from "@/core/weather";
import type { TrackCondition } from "@/game/types";

const ICONS: Record<SimWeatherPattern, typeof Sun> = {
  clear: Sun,
  overcast: Cloud,
  shower: CloudDrizzle,
  rain: CloudRain,
  snow: Snowflake,
  storm: CloudLightning,
};

interface Props {
  trackId?: string;
  trackCondition?: TrackCondition;
}

export function WeatherForecastStrip({ trackId, trackCondition }: Props) {
  const forecast = useGame((s) =>
    trackId ? (s.weather?.forecast?.[trackId] ?? []) : ([] as WeatherState[]),
  );
  const current = useGame((s) =>
    trackId ? s.weather?.byTrack?.[trackId]?.slice(-1)[0] : undefined,
  );

  if (!trackId) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap text-[10px]">
      {trackCondition && (
        <Badge variant="outline" className="h-5 px-1.5 capitalize">
          <JargonTooltip term={trackCondition}>{trackCondition}</JargonTooltip>
        </Badge>
      )}
      {current && (
        <span className="text-muted-foreground tabular-nums">
          {Math.round(current.tempC)}°C · {Math.round(current.humidity * 100)}%
        </span>
      )}
      {forecast.length > 0 && (
        <div className="flex items-center gap-0.5 ml-auto" aria-label="7-day forecast">
          {forecast.slice(0, 7).map((w) => {
            const Icon = ICONS[w.pattern];
            return (
              <JargonTooltip key={w.day} term={w.pattern}>
                <Icon
                  className="h-3 w-3 text-muted-foreground hover:text-cream transition-colors"
                  aria-label={w.pattern}
                />
              </JargonTooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
