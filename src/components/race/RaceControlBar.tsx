import { TOOLTIP_DELAY_MS } from "@/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Camera, Pause, Play, Thermometer, Wind } from "lucide-react";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/game/types";
import { getWeatherDisplay } from "@/components/race/raceVisualHelpers";

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
  onTakeSnapshot?: () => void;
  onOpenSnapshotInspector?: () => void;
  snapshotCount?: number;
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
  onTakeSnapshot,
  onOpenSnapshotInspector,
  snapshotCount,
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
                  {r.isPlayer ? "⭐ " : ""}
                  {i + 1}. {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={onShowAllCards}
                aria-label="Show all horse stat cards"
              >
                Cards
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show all horse stat cards</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {!finished && onTakeSnapshot && (
          <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTakeSnapshot}
                  className="gap-1.5 border-white/20 bg-black/40 hover:bg-white/10 text-white"
                  aria-label="Snapshot in-running conditions"
                >
                  <Camera className="h-3.5 w-3.5 text-broadcast-accent" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Snapshot</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Freeze current in-running conditions for inspection while live race continues
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {snapshotCount !== undefined && snapshotCount > 0 && onOpenSnapshotInspector && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenSnapshotInspector}
            className="gap-1.5 bg-broadcast-accent/20 border border-broadcast-accent/40 text-broadcast-accent hover:bg-broadcast-accent/30"
            aria-label={`Inspect ${snapshotCount} captured snapshot${snapshotCount > 1 ? "s" : ""}`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Snapshots ({snapshotCount})
            </span>
          </Button>
        )}

        {!finished && (
          <Button
            size="sm"
            variant={paused ? "default" : "secondary"}
            onClick={onTogglePause}
            className="gap-1.5"
            aria-label={paused ? "Resume race" : "Pause race"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="text-[11px] font-black uppercase tracking-widest">
              {paused ? "Resume" : "Pause"}
            </span>
          </Button>
        )}

        {!finished && !paused && (
          <>
            <Button
              size="sm"
              variant={speed === 1 ? "secondary" : "ghost"}
              onClick={() => onSetSpeed(1)}
              aria-label="Set speed to 1x"
            >
              1x
            </Button>
            <Button
              size="sm"
              variant={speed === 2 ? "secondary" : "ghost"}
              onClick={() => onSetSpeed(2)}
              aria-label="Set speed to 2x"
            >
              2x
            </Button>
            <Button
              size="sm"
              variant={speed === 4 ? "secondary" : "ghost"}
              onClick={() => onSetSpeed(4)}
              aria-label="Set speed to 4x"
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
            aria-label="Hide results until all horses finish"
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
