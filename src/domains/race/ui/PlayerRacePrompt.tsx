import { useGame, useGameWithShallow } from "@/platform/game/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Thermometer, Wind } from "lucide-react";
import { WeatherForecastStrip } from "@/domains/race/ui/WeatherForecastStrip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { gameCalendarDate } from "@/domains/race/application/raceFacade";
import { buildRaceField, rngForRace } from "@/domains/race/application/raceFacade";
import { runRaceToCompletion, toRaceRunner } from "@/domains/race/application/raceFacade";
import { getCourseForRace } from "@/shared/data/tracks";
import { formatCurrency } from "@/domains/race/application/raceFacade";
import { useMemo, useState } from "react";
import { INSTRUCTION_PRESETS, buildInstructions, type PresetId } from "@/domains/race/application/TacticOptions";
import { AGGRESSIVENESS_DEFAULT } from "@/shared/constants/tacticsConstants";;
import { DEFAULT_DT, defaultMaxTime } from "@/domains/race/model/engine/constants";;

export function PlayerRacePrompt() {
  const pendingRaceId = useGame((s) => s.execution?.interruptRaceId);
  const races = useGameWithShallow((s) => s.races ?? {});
  const horses = useGameWithShallow((s) => s.horses ?? {});
  const jockeys = useGameWithShallow((s) => s.jockeys ?? []);
  const day = useGame((s) => s.day);
  const resolveRaceWithImpacts = useGame((s) => s.resolveRaceWithImpacts);
  const setRaceTactics = useGame((s) => s.setRaceTactics);
  const navigate = useNavigate();
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("default");

  const race = pendingRaceId ? races[pendingRaceId] : undefined;
  const raceWeather = useGame((s) => {
    const trackId = race?.graded?.trackId ?? race?.trackId;
    if (!trackId) return undefined;
    const buf = s.weather?.byTrack?.[trackId];
    if (!buf || !buf.length) return undefined;
    return buf.find((w) => w.day === race?.day) ?? buf[buf.length - 1];
  });

  const enteredHorse = useMemo(() => {
    if (!race) return undefined;
    const ownedEntry = race.entries.find((e) => e.ownership?.type === "player");
    return ownedEntry ? horses[ownedEntry.horseId] : undefined;
  }, [race, horses]);

  if (!race) return null;

  function clearPending() {
    const ex = useGame.getState().execution;
    if (ex) useGame.setState({ execution: { ...ex, interruptRaceId: undefined } });
  }

  function stopHere() {
    const ex = useGame.getState().execution;
    useGame.setState({
      execution: ex
        ? { ...ex, status: "idle", interruptRaceId: undefined, remainingDays: undefined }
        : ex,
    });
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
            aggressiveness: AGGRESSIVENESS_DEFAULT,
          },
        },
        enteredHorse.id,
        race!.id,
      );
      setRaceTactics(race!.id, enteredHorse.id, instructions);
    }

    const { runners } = buildRaceField({
      race: race!,
      horses: Object.values(horses),
      jockeys,
      hiredStaff: useGame.getState().hiredStaff ?? [],
      npcStables: useGame.getState().npcStables,
      npcAIManager: useGame.getState().npcAIManager,
      currentDay: day,
      weatherPattern: raceWeather?.pattern,
    });
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
      raceWeather?.windDirectionDeg,
    );
    resolveRaceWithImpacts(
      race!.id,
      result.result,
      runners.map(toRaceRunner),
      result.factorLedgers,
      result.snapshots,
    );
    clearPending();
  }

  return (
    <Dialog
      open={!!pendingRaceId}
      onOpenChange={(open) => {
        if (!open) stopHere();
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
              <Select value={selectedPreset} onValueChange={(v: string) => setSelectedPreset(v)}>
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
          <Button onClick={stopHere} variant="ghost" className="flex-1">
            Stop Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
