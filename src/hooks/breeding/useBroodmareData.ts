import { useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import { usePregnancies } from "@/hooks/game/useBreedingState";
import type { GameState, Pregnancy, Horse } from "@/game/types";

export interface BroodmareEntry {
  pregnancy: Pregnancy;
  dam: Horse;
  sire: Horse | undefined;
  daysRemaining: number;
  maternityLog: { day: number; text: string }[];
}

export function useBroodmareData() {
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const pregnancies = usePregnancies();
  const day = useGame((s: GameState) => s.day);
  const log = useGameWithShallow((s: GameState) => s.log);

  const activePregnancies = pregnancies.filter((p) => !p.resolved);

  const sortedBroodmares = useMemo(() => {
    const data = activePregnancies
      .map((pregnancy) => {
        const dam = horses[pregnancy.damId] as Horse | undefined;
        const sire = horses[pregnancy.sireId] as Horse | undefined;
        const daysRemaining = pregnancy.dueDay - day - 1;

        const maternityLog = log.filter(
          (l) =>
            l.text.includes(pregnancy.damName) &&
            (l.text.includes("Mated") || l.text.includes("Foal")),
        );

        return {
          pregnancy,
          dam,
          sire,
          daysRemaining,
          maternityLog,
        };
      })
      .filter((data): data is BroodmareEntry => data.dam !== undefined);

    data.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return data;
  }, [activePregnancies, horses, day, log]);

  return {
    day,
    sortedBroodmares,
  };
}
