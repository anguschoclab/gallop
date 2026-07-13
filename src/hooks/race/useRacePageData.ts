import { useRef, useMemo } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import type { GameState, Horse } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  buildRaceField,
  rngForRace,
  type RaceSimulationDependencies,
} from "@/services/race/raceSimulationService";
import { calculateWinProbability, probabilityToMorningLine, formatOdds } from "@/core/odds";
import { calculateClassBonus } from "@/core/common/classBonus";
import { NarrativeGenerator } from "@/services/narrative/narrativeService";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";

export function useRacePageData(raceId: string) {
  const race = useGameWithShallow((s: GameState) => s.races[raceId]);
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const jockeys = useGameWithShallow((s: GameState) => s.jockeys ?? []);
  const stables = useGameWithShallow((s: GameState) => s.npcStables);
  const resolveRaceWithImpacts = useGame((s) => s.resolveRaceWithImpacts);
  const raceWeather = useGameWithShallow((s: any) => {
    if (!race) return undefined;
    const trackId = race.graded?.trackId ?? race.trackId;
    if (!trackId) return undefined;
    const buf = s.weather?.byTrack?.[trackId];
    if (!buf || !buf.length) return undefined;
    return buf.find((w: any) => w.day === race.day) ?? buf[buf.length - 1];
  });

  const runners = useMemo<Runner[]>(() => {
    if (!race) return [];
    const deps: RaceSimulationDependencies = { race, horses: Object.values(horses) as any, jockeys };
    const { runners: built } = buildRaceField(deps);
    return built;
  }, [raceId, horses, jockeys]);

  const rngRef = useRef<any>(null);
  const narrativeRef = useRef<NarrativeGenerator | null>(null);
  const messageQueue = useRef<CommentaryLine[]>([]);
  const lastRaceIdRef = useRef<string | null>(null);

  if (lastRaceIdRef.current !== raceId) {
    lastRaceIdRef.current = raceId;
    rngRef.current = race ? rngForRace(race) : null;
    narrativeRef.current = race
      ? new NarrativeGenerator(race, Object.values(horses) as any, stables, rngRef.current)
      : null;
    messageQueue.current = [];
  }

  const localHorseMap = useMemo(() => new Map<string, Horse>(Object.entries(horses)), [horses]);

  const classBonus = race ? calculateClassBonus(race.graded?.grade, race.raceClass) : 0;

  const runnerOdds = useMemo(() => {
    const oddsMap = new Map<string, string>();
    for (const runner of runners) {
      const horse = horses[runner.horseId];
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

  const calibratedPars = useGameWithShallow((s: GameState) => s.calibratedPars);

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
