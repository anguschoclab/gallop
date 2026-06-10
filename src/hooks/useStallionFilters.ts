import { useState, useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import type { Horse, Hemisphere, GameState } from "@/game/types";

export function useStallionFilters() {
  const horses = (useGame as any)((s: GameState) => s.horses, shallow);
  const npcStables = (useGame as any)((s: GameState) => s.npcStables, shallow);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const breed = useGame((s) => s.breed);
  const updateStudFee = useGame((s) => s.updateStudFee);
  const pregnancies = (useGame as any)((s: GameState) => s.pregnancies, shallow);

  const [hemisphere, setHemisphere] = useState<Hemisphere | "all">("all");
  const [selectedMareId, setSelectedMareId] = useState<string>("");

  const stallions = horses.filter((h: Horse) => h.stud?.atStud);
  const myStallions = stallions.filter((h: Horse) => h.owned);
  const rosterStallions = stallions.filter((h: Horse) => !h.owned || h.stableId === undefined);

  const filtered = useMemo(
    () =>
      stallions
        .filter((h: Horse) => hemisphere === "all" || h.hemisphere === hemisphere)
        .sort((a: Horse, b: Horse) => a.stud!.standingFee - b.stud!.standingFee),
    [stallions, hemisphere],
  );

  const eligibleMares = useMemo(
    () =>
      horses.filter(
        (h: Horse) =>
          h.owned &&
          (h.gender === "mare" || h.gender === "filly") &&
          h.age >= 3 &&
          !pregnancies.some((p: any) => !p.resolved && p.damId === h.id),
      ),
    [horses, pregnancies],
  );

  const selectedMare = eligibleMares.find((h: Horse) => h.id === selectedMareId);

  const stableNameFor = (stableId?: string): string => {
    if (!stableId) return "Owned";
    return npcStables.find((s: any) => s.id === stableId)?.name ?? "Unknown stable";
  };

  return {
    day,
    cash,
    breed,
    updateStudFee,
    horses,
    npcStables,
    myStallions,
    rosterStallions,
    filtered,
    eligibleMares,
    selectedMare,
    selectedMareId,
    setSelectedMareId,
    hemisphere,
    setHemisphere,
    stableNameFor,
  };
}
