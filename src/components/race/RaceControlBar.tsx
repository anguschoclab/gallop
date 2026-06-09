import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Camera, Pause, Play, Thermometer, Wind } from "lucide-react";
import type { Runner } from "@/game/raceSim";
import type { Race } from "@/game/types";
import { getWeatherDisplay } from "@/components/races/raceVisualHelpers";

interface RaceControlBarProps {
  race: Race;
  runners: Runner[];
  finished: boolean;
  paused: boolean;
  speed: number;
  followTarget: string | null;
  anyFinished: boolean;
  allFinished: boolean;
  hideUntilAllFinished: boolean;
  raceWeather?: {
    tempC: number;
    windKph: number;
  };
  onNavigateBack: () => void;
  onTogglePause: () => void;
  onSetSpeed: (speed: number) => void;
  onSetFollowTarget: (id: string | null) => void;
  onToggleHideResults: () => void;
  onShowAllCards: () => void;
}

export function RaceControlBar({
  race,
  runners,
  finished,
  paused,
  speed,
  followTarget,
  anyFinished,
  allFinished,
  hideUntilAllFinished,
  raceWeather,
  onNavigateBack,
  onTogglePause,
  onSetSpeed,
  onSetFollowTarget,
  onToggleHideResults,
  onShowAllCards,
}: RaceControlBarProps) {
  return (
    <div className="relative z-10 p-4 flex items-center justify-between border-b border-white/10 bg-broadcast-marquee backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-bold text-cream flex items-center gap-2">
          {race.name}
          {race.graded?.requiresInvitation && (
            <span className="inline-block bg-amber-600 text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
              Invitation Only
            </span>
          )}
        </h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          {race.distance}m · {race.raceClass} · Purse ${race.purse.toLocaleString()}
          {race.weather && ` · ${getWeatherDisplay(race.weather)}`}
          {race.trackCondition && ` · Track: ${race.trackCondition}`}
          {raceWeather && (
            <span className="inline-flex items-center gap-0.5">
              <Thermometer className="h-3 w-3" />
              {Math.round(raceWeather.tempC)}°C
              <Wind className="h-3 w-3 ml-1" />
              {Math.round(raceWeather.windKph)} km/h
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!finished && (
          <Select
            value={followTarget || "leader"}
            onValueChange={(v) => onSetFollowTarget(v === "leader" ? null : v)}
          >
            <SelectTrigger className="h-8 w-40 text-xs bg-muted border-border text-foreground">
              <Camera className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leader">Follow Leader</SelectItem>
              {runners.map((r, i) => (
                <SelectItem key={r.horseId} value={r.horseId}>
                  {r.owned ? "⭐ " : ""}
                  {i + 1}. {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button size="sm" variant="ghost" onClick={onShowAllCards} title="Show all horse stat cards">
          Cards
        </Button>

        {!finished && (
          <Button
            size="sm"
            variant={paused ? "secondary" : "ghost"}
            onClick={onTogglePause}
            className="px-2"
            title="Spacebar to toggle"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        )}

        {!finished && !paused && (
          <>
            <Button
              size="sm"
              variant={speed === 1 ? "secondary" : "ghost"}
              onClick={() => onSetSpeed(1)}
              title="Press 1"
            >
              1x
            </Button>
            <Button
              size="sm"
              variant={speed === 2 ? "secondary" : "ghost"}
              onClick={() => onSetSpeed(2)}
              title="Press 2"
            >
              2x
            </Button>
            <Button
              size="sm"
              variant={speed === 4 ? "secondary" : "ghost"}
              onClick={() => onSetSpeed(4)}
              title="Press 4"
            >
              4x
            </Button>
          </>
        )}

        {anyFinished && !allFinished && (
          <Button
            size="sm"
            variant={hideUntilAllFinished ? "secondary" : "ghost"}
            onClick={onToggleHideResults}
            title="Hide results until all horses finish"
          >
            {hideUntilAllFinished ? "Revealing…" : "Hide Results"}
          </Button>
        )}

        {finished && (
          <Button size="sm" onClick={onNavigateBack}>
            Back to races
          </Button>
        )}
      </div>
    </div>
  );
}
