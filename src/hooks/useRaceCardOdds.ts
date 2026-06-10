import { useMemo } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import { calculateWinProbability, probabilityToMorningLine, formatOdds } from "@/core/odds";
import type { Race } from "@/game/types";

export function useRaceCardOdds(race: Race) {
  const horses = useGameWithShallow((s) => s.horses);

  const localHorseMap = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);

  const classBonus = useGame((s) => {
    if (race.graded?.grade) {
      const grade = race.graded.grade;
      if (grade === "G1") return 15;
      if (grade === "G2") return 10;
      if (grade === "G3") return 5;
      if (grade === "Listed") return 3;
    }
    return 0;
  });

  const favoriteOdds = useMemo(() => {
    let bestOdds = "N/A";
    let bestProbability = 0;

    for (const entry of race.entries) {
      const horse = localHorseMap.get(entry.horseId);
      if (horse) {
        const probability = calculateWinProbability(
          horse.stats.speed,
          horse.stats.stamina,
          horse.stats.acceleration,
          horse.form,
          classBonus,
        );
        if (probability > bestProbability) {
          bestProbability = probability;
          const morningLine = probabilityToMorningLine(probability);
          bestOdds = formatOdds(morningLine);
        }
      }
    }

    return bestOdds;
  }, [race.entries, localHorseMap, classBonus]);

  return favoriteOdds;
}
