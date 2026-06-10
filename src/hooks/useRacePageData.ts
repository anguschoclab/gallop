import { useState, useRef, useMemo } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import type { GameState, Horse } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  buildRaceField,
  rngForRace,
  type RaceSimulationDependencies,
} from "@/services/raceSimulationService";
import { calculateWinProbability, probabilityToMorningLine, formatOdds } from "@/core/odds";
import { calculateClassBonus } from "@/core/common/classBonus";
import { NarrativeGenerator } from "@/services/narrativeService";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";

export function useRacePageData(raceId: string) {
  const race = (useGame as any)(
    (s: GameState) => s.races.find((r: any) => r.id === raceId),
    shallow,
  );
  const horses = (useGame as any)((s: GameState) => s.horses, shallow);
  const jockeys = useGameWithShallow((s: GameState) => s.jockeys ?? []);
  const stables = (useGame as any)((s: GameState) => s.npcStables, shallow);
  const resolveRaceWithImpacts = useGame((s) => s.resolveRaceWithImpacts);
  const raceWeather = (useGame as any)((s: any) => {
    if (!race) return undefined;
    const trackId = race.graded?.trackId ?? race.trackId;
    if (!trackId) return undefined;
    const buf = s.weather?.byTrack?.[trackId];
    if (!buf || !buf.length) return undefined;
    return buf.find((w: any) => w.day === race.day) ?? buf[buf.length - 1];
  }, shallow);

  const [runners] = useState<Runner[]>(() => {
    if (!race) return [];
    const deps: RaceSimulationDependencies = { race, horses, jockeys };
    const { runners: built } = buildRaceField(deps);
    return built;
  });

  const rngRef = useRef<any>(null);
  if (!rngRef.current && race) {
    rngRef.current = rngForRace(race);
  }

  const narrativeRef = useRef<NarrativeGenerator | null>(null);
  const messageQueue = useRef<CommentaryLine[]>([]);

  if (!narrativeRef.current && race) {
    narrativeRef.current = new NarrativeGenerator(race, horses, stables, rngRef.current);
  }

  const localHorseMap = useMemo(
    () => new Map<string, Horse>(horses.map((h: Horse) => [h.id, h])),
    [horses],
  );

  const classBonus = race ? calculateClassBonus(race.graded?.grade, race.raceClass) : 0;

  const runnerOdds = useMemo(() => {
    const oddsMap = new Map<string, string>();
    for (const runner of runners) {
      const horse = localHorseMap.get(runner.horseId);
      if (horse) {
        const probability = calculateWinProbability(
          horse.stats.speed,
          horse.stats.stamina,
          horse.stats.acceleration,
          horse.form,
          classBonus,
        );
        const morningLine = probabilityToMorningLine(probability);
        oddsMap.set(runner.horseId, formatOdds(morningLine));
      }
    }
    return oddsMap;
  }, [runners, localHorseMap, classBonus]);

  const calibratedPars = (useGame as any)((s: GameState) => s.calibratedPars, shallow);

  return {
    race,
    horses,
    runners,
    raceWeather,
    resolveRaceWithImpacts,
    narrativeRef,
    messageQueue,
    localHorseMap,
    runnerOdds,
    classBonus,
    calibratedPars,
    rngRef,
  };
}
