import { useMemo } from "react";
import { useGameWithShallow } from "@/game/store";
import { calculateWinProbability, probabilityToMorningLine, formatOdds } from "@/core/odds";
import { calculateClassBonus } from "@/core/common/classBonus";
import type { Race } from "@/game/types";

export function useRaceCardOdds(race: Race) {
  const horses = useGameWithShallow((s) => s.horses);

  const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);

  const favoriteOdds = useMemo(() => {
    let bestOdds = "N/A";
    let bestProbability = 0;

    for (const entry of race.entries) {
      const horse = horses[entry.horseId];
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
  }, [race.entries, horses, classBonus]);

  return favoriteOdds;
}
