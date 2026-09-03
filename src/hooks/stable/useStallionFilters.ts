import { useState, useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGameSelector } from "@/hooks/shared/useGameSelector";
import { useGame } from "@/game/store";
import { usePregnancies } from "@/hooks/game/useBreedingState";
import type { Horse, Hemisphere, GameState } from "@/game/types";
import { isPlayerOwned, getStableId } from "@/core/horse/ownership";

export function useStallionFilters() {
  const horses = useGameSelector((s: GameState) => s.horses);
  const npcStables = useGameSelector((s: GameState) => s.npcStables);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const breed = useGame((s) => s.breed);
  const updateStudFee = useGame((s) => s.updateStudFee);
  const pregnancies = usePregnancies();

  const [hemisphere, setHemisphere] = useState<Hemisphere | "all">("all");
  const [selectedMareId, setSelectedMareId] = useState<string>("");

  const stallions = Object.values(horses).filter((h: Horse) => h.stud?.atStud);
  const myStallions = stallions.filter((h: Horse) => isPlayerOwned(h));
  const rosterStallions = stallions.filter(
    (h: Horse) => !isPlayerOwned(h) || getStableId(h) === undefined,
  );

  const filtered = useMemo(
    () =>
      stallions
        .filter((h: Horse) => hemisphere === "all" || h.hemisphere === hemisphere)
        .sort((a: Horse, b: Horse) => a.stud!.standingFee - b.stud!.standingFee),
    [stallions, hemisphere],
  );

  const eligibleMares = useMemo(
    () =>
      Object.values(horses).filter(
        (h: Horse) =>
          isPlayerOwned(h) &&
          (h.gender === "mare" || h.gender === "filly") &&
          h.age >= 3 &&
          !pregnancies.some((p) => !p.resolved && p.damId === h.id),
      ),
    [horses, pregnancies],
  );

  const selectedMare = eligibleMares.find((h: Horse) => h.id === selectedMareId);

  const stableNameFor = (stableId?: string): string => {
    if (!stableId) return "Owned";
    return npcStables.find((s) => s.id === stableId)?.name ?? "Unknown stable";
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
