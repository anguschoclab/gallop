import { useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";

export interface BroodmareEntry {
  pregnancy: any;
  dam: any;
  sire: any;
  daysRemaining: number;
  maternityLog: any[];
}

export function useBroodmareData() {
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const pregnancies = useGameWithShallow((s: GameState) => s.pregnancies);
  const day = useGame((s: GameState) => s.day);
  const log = useGameWithShallow((s: GameState) => s.log);

  const activePregnancies = pregnancies.filter((p: any) => !p.resolved);

  const sortedBroodmares = useMemo(() => {
    const data: BroodmareEntry[] = activePregnancies
      .map((pregnancy: any) => {
        const dam = horses[pregnancy.damId];
        const sire = horses[pregnancy.sireId];
        const daysRemaining = pregnancy.dueDay - day - 1;

        const maternityLog = log.filter(
          (l: any) =>
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
      .filter((data: any) => data.dam);

    data.sort((a: BroodmareEntry, b: BroodmareEntry) => a.daysRemaining - b.daysRemaining);
    return data;
  }, [activePregnancies, horses, day, log]);

  return {
    day,
    sortedBroodmares,
  };
}
