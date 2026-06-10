import { useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";

export interface BroodmareEntry {
  pregnancy: any;
  dam: any;
  sire: any;
  daysRemaining: number;
  maternityLog: any[];
}

export function useBroodmareData() {
  const horses = (useGame as any)((s: GameState) => s.horses, shallow);
  const horseMap = (useGame as any)((s: GameState) => s.horseMap, shallow);
  const pregnancies = (useGame as any)((s: GameState) => s.pregnancies, shallow);
  const day = useGame((s: GameState) => s.day);
  const log = (useGame as any)((s: GameState) => s.log, shallow);

  const activePregnancies = pregnancies.filter((p: any) => !p.resolved);

  const sortedBroodmares = useMemo(() => {
    const data: BroodmareEntry[] = activePregnancies
      .map((pregnancy: any) => {
        const dam = horseMap.get(pregnancy.damId);
        const sire = horseMap.get(pregnancy.sireId);
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
  }, [activePregnancies, horseMap, day, log]);

  return {
    day,
    sortedBroodmares,
  };
}
