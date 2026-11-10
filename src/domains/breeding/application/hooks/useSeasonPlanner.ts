import { useMemo, useCallback } from "react";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import { usePregnancies } from "@/platform/game/hooks/useBreedingState";
import type { GameState, Horse } from "@/platform/game/types";
import type { Pregnancy } from "@/domains/breeding/model/types";
import {
  inBreedingSeason,
  nextBreedingSeasonStart,
} from "@/domains/calendar/simulation/breedingCalendar";
import { isFemaleHorse } from "@/domains/horse/simulation/gender";
import { getAvailableStallions } from "@/domains/breeding/simulation/stallions";
import {
  suggestBestSires,
  type SireSuggestion,
} from "@/domains/breeding/simulation/sireSuggestions";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE } from "@/domains/breeding/model/breedingConstants";
import type { MatingPlanEntry } from "@/platform/game/store/state/breedingState";
import { isPlayerOwned, getStableId } from "@/domains/horse/simulation/ownership";
import { useMatingAssignments } from "@/domains/breeding/application/hooks/useMatingAssignments";
import { useMatingPlanActions } from "@/domains/breeding/application/hooks/useMatingPlanActions";

export function useSeasonPlanner() {
  const horses = useGameWithShallow((s: GameState) => s.horses || []);
  const pregnancies = usePregnancies();
  const savedMatingPlans = useGameWithShallow((s: GameState) => s.savedMatingPlans || []);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);

  const horseList = useMemo(() => Object.values(horses), [horses]);

  const eligibleMares = useMemo(() => {
    return horseList.filter(
      (h: Horse) =>
        isPlayerOwned(h) &&
        isFemaleHorse(h.gender) &&
        h.age >= 3 &&
        h.lifecycleStatus !== "deceased" &&
        !pregnancies.some((p: Pregnancy) => !p.resolved && p.damId === h.id),
    );
  }, [horseList, pregnancies]);

  const availableStallions = useMemo(() => getAvailableStallions(horseList), [horseList]);

  const northernSeasonOpen = inBreedingSeason(day, "Northern");
  const southernSeasonOpen = inBreedingSeason(day, "Southern");
  const seasonOpen = northernSeasonOpen || southernSeasonOpen;
  const nextNorthernSeason = nextBreedingSeasonStart(day, "Northern");
  const nextSouthernSeason = nextBreedingSeasonStart(day, "Southern");
  const nextSeasonStart = Math.min(nextNorthernSeason, nextSouthernSeason);

  const suggestionsForMare = useCallback(
    (damId: string): SireSuggestion[] => {
      const mare = horses[damId];
      if (!mare) return [];
      return suggestBestSires(mare, availableStallions, day);
    },
    [horses, availableStallions, day],
  );

  const calculateFee = useCallback(
    (entry: MatingPlanEntry): number => {
      const sire = horses[entry.sireId];
      if (!sire) return 0;
      const isExternal = !!getStableId(sire);
      if (!isExternal) return 0;
      const studFee = sire.stud?.standingFee ?? 0;
      return BREEDING_FEE + (entry.liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee;
    },
    [horses],
  );

  const {
    assignments,
    setAssignments,
    assignedCount,
    setSireForMare,
    setLFGForMare,
    clearMare,
    clearAll,
    autoAssign,
  } = useMatingAssignments({ eligibleMares, availableStallions, day });

  const { confirmAll, savePlan, loadPlan, deletePlan } = useMatingPlanActions({
    assignments,
    setAssignments,
    eligibleMares,
  });

  const totalCost = useMemo(() => {
    return Object.values(assignments).reduce((sum, entry) => sum + calculateFee(entry), 0);
  }, [assignments, calculateFee]);

  const canAffordAll = cash >= totalCost;

  return {
    eligibleMares,
    availableStallions,
    savedMatingPlans,
    assignments,
    assignedCount,
    totalCost,
    canAffordAll,
    seasonOpen,
    nextSeasonStart,
    day,
    cash,
    suggestionsForMare,
    setSireForMare,
    setLFGForMare,
    clearMare,
    clearAll,
    autoAssign,
    confirmAll,
    savePlan,
    loadPlan,
    deletePlan,
    calculateFee,
  };
}
