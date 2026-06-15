import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Thermometer, Wind } from "lucide-react";
import { WeatherForecastStrip } from "@/components/race/WeatherForecastStrip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";
import { buildRaceField, rngForRace } from "@/services/race/raceSimulationService";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { getCourseForRace } from "@/data/tracks";
import { formatCurrency } from "@/core/common/formatting";
import { useMemo, useState } from "react";
import { INSTRUCTION_PRESETS, buildInstructions, type PresetId } from "./TacticOptions";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { DEFAULT_DT, defaultMaxTime } from "@/core/race/engine/constants";

export function PlayerRacePrompt() {
  const pendingRaceId = useGame((s) => s.pendingPlayerRaceId);
  const races = useGameWithShallow((s) => s.races ?? []);
  const horses = useGameWithShallow((s) => s.horses ?? []);
  const jockeys = useGameWithShallow((s) => s.jockeys ?? []);
  const day = useGame((s) => s.day);
  const resolveRaceWithImpacts = useGame((s) => s.resolveRaceWithImpacts);
  const setRaceTactics = useGame((s) => s.setRaceTactics);
  const navigate = useNavigate();
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("default");

  const horseMap = useGame((s) => s.horseMap);
  const raceMap = useMemo(() => new Map(races.map((r) => [r.id, r])), [races]);
  const race = pendingRaceId ? raceMap.get(pendingRaceId) : undefined;
  const raceWeather = useGame((s) => {
    const trackId = race?.graded?.trackId ?? race?.trackId;
    if (!trackId) return undefined;
    const buf = s.weather?.byTrack?.[trackId];
    if (!buf || !buf.length) return undefined;
    return buf.find((w) => w.day === race?.day) ?? buf[buf.length - 1];
  });
  if (!race) return null;

  const enteredHorse = useMemo(() => {
    const ownedEntry = race.entries.find((e) => e.owned);
    return ownedEntry ? horseMap.get(ownedEntry.horseId) : undefined;
  }, [race, horseMap]);

  function clearPending() {
    useGame.setState({ pendingPlayerRaceId: undefined });
  }

  function goToRace() {
    clearPending();
    navigate({ to: "/race/$raceId", params: { raceId: race!.id } });
  }

  function autoResolve() {
    // Set tactics before resolving
    if (enteredHorse) {
      const instructions = buildInstructions(
        {
          id: selectedPreset,
          name: "",
          desc: "",
          instructions: {
            horseId: enteredHorse.id,
            raceId: race!.id,
            ridingStyle: "tactical",
            earlyPosition: "midpack",
            moveTiming: "mid",
            aggressiveness: 50,
          },
        },
        enteredHorse.id,
        race!.id,
      );
      setRaceTactics(race!.id, enteredHorse.id, instructions);
    }

    const { runners } = buildRaceField({ race: race!, horses, jockeys });
    const course = getCourseForRace(race!);
    const result = runRaceToCompletion(
      runners,
      race!.distance,
      rngForRace(race!),
      DEFAULT_DT,
      defaultMaxTime(race!.distance),
      course,
      true,
      raceWeather?.windKph,
    );
    resolveRaceWithImpacts(race!.id, result.result);
    clearPending();
  }

  return (
    <Dialog
      open={!!pendingRaceId}
      onOpenChange={(open) => {
        if (!open) clearPending();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Race Day — {gameCalendarDate(day + 1)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-base font-semibold">{race.name}</p>
          <p className="text-sm text-muted-foreground">
            {race.distance}m · {race.raceClass} · Purse {formatCurrency(race.purse)}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
            <WeatherForecastStrip
              trackId={race.graded?.trackId ?? race.trackId}
              trackCondition={race.trackCondition}
            />
          </div>
          {enteredHorse && (
            <p className="text-sm">
              <span className="font-medium">{enteredHorse.name}</span> is entered in this race.
            </p>
          )}
          {enteredHorse && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Instructions</label>
              <Select value={selectedPreset} onValueChange={(v: any) => setSelectedPreset(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTRUCTION_PRESETS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name} - {opt.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={goToRace} className="flex-1">
            Go to Race ↗
          </Button>
          <Button onClick={autoResolve} variant="secondary" className="flex-1">
            Auto-Resolve & Continue
          </Button>
          <Button onClick={clearPending} variant="ghost" className="flex-1">
            Stop Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
