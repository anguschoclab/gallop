import { useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState, Horse } from "@/game/types";

export function useRecapData() {
  const races = useGameWithShallow((s: GameState) => s.races);
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const calibratedPars = useGameWithShallow((s: GameState) => s.calibratedPars);
  const day = useGame((s: GameState) => s.day);

  const localHorseMap = useMemo(() => new Map(Object.entries(horses)), [horses]);

  const weekAgo = day - 7;
  const recentGradedRaces = useMemo(
    () =>
      Object.values(races)
        .filter(
          (r: any) =>
            r.resolved &&
            r.graded &&
            r.result &&
            r.result.length > 0 &&
            r.day >= weekAgo &&
            r.day <= day,
        )
        .sort((a: any, b: any) => {
          const gradeOrder: any = { G1: 3, G2: 2, G3: 1 };
          const gradeDiff = gradeOrder[b.graded!.grade] - gradeOrder[a.graded!.grade];
          if (gradeDiff !== 0) return gradeDiff;
          return b.day - a.day;
        })
        .slice(0, 12),
    [races, weekAgo, day],
  );

  return {
    day,
    localHorseMap,
    recentGradedRaces,
    calibratedPars,
  };
}
