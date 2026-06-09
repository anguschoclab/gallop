import { Badge } from "@/components/ui/badge";
import { MapPin, CloudSun, Clock, Thermometer, Wind } from "lucide-react";
import { getWeatherDisplay } from "@/components/race/raceVisualHelpers";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import type { Race } from "@/game/types";

interface Props {
  race: Race;
  raceWeather?: {
    tempC: number;
    windKph: number;
  };
}

export function RaceEntryHeader({ race, raceWeather }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        {race.graded?.track || race.trackId || "Local Track"}
      </span>
      <span>· {race.distance}m</span>
      <span>· {race.surface || race.graded?.surface || "Turf"}</span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Day {race.day}
      </span>
      {race.weather && (
        <span className="flex items-center gap-1">
          <CloudSun className="h-3 w-3" />
          {getWeatherDisplay(race.weather)}
        </span>
      )}
      {raceWeather && (
        <span className="flex items-center gap-1">
          <Thermometer className="h-3 w-3" />
          {Math.round(raceWeather.tempC)}°C
        </span>
      )}
      {raceWeather && (
        <span className="flex items-center gap-1">
          <Wind className="h-3 w-3" />
          {Math.round(raceWeather.windKph)} km/h
        </span>
      )}
      {race.trackCondition && (
        <Badge variant="outline" className="h-4 px-1.5 text-[9px] capitalize">
          {race.trackCondition}
        </Badge>
      )}
      {race.graded?.requiresInvitation && (
        <Badge className="bg-amber-600 text-white text-[10px] h-4 px-1.5">
          Invitation Only
        </Badge>
      )}
      <div className="ml-auto">
        <WeatherForecastStrip
          trackId={race.trackId ?? race.graded?.trackId ?? race.graded?.track}
          trackCondition={race.trackCondition}
        />
      </div>
    </div>
  );
}
