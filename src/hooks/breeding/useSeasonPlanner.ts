import { useState, useMemo, useCallback } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState, Horse } from "@/game/types";
import type { Pregnancy } from "@/core/breeding/types";
import { inBreedingSeason, nextBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { isFemaleHorse } from "@/core/horse/gender";
import { getAvailableStallions } from "@/core/breeding/stallions";
import { suggestBestSires, type SireSuggestion } from "@/core/breeding/sireSuggestions";
import { BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE } from "@/constants";
import type { MatingPlanEntry } from "@/game/store/state/breedingState";
import { isPlayerOwned, getStableId } from "@/core/horse/ownership";

export function useSeasonPlanner() {
  const horses = useGameWithShallow((s: GameState) => s.horses || []);
  const pregnancies = useGameWithShallow((s: GameState) => s.pregnancies || []);
  const savedMatingPlans = useGameWithShallow((s: GameState) => s.savedMatingPlans || []);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const breedBatch = useGame((s) => s.breedBatch);
  const saveMatingPlan = useGame((s) => s.saveMatingPlan);
  const deleteMatingPlan = useGame((s) => s.deleteMatingPlan);
  const getSavedMatingPlan = useGame((s) => s.getSavedMatingPlan);

  const [assignments, setAssignments] = useState<Record<string, MatingPlanEntry>>({});

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

  const totalCost = useMemo(() => {
    return Object.values(assignments).reduce((sum, entry) => sum + calculateFee(entry), 0);
  }, [assignments, calculateFee]);

  const canAffordAll = cash >= totalCost;
  const assignedCount = Object.keys(assignments).length;

  const setSireForMare = useCallback((damId: string, sireId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [damId]: {
        damId,
        sireId,
        liveFoalGuarantee: prev[damId]?.liveFoalGuarantee ?? false,
      },
    }));
  }, []);

  const setLFGForMare = useCallback((damId: string, liveFoalGuarantee: boolean) => {
    setAssignments((prev) => {
      const existing = prev[damId];
      if (!existing) return prev;
      return { ...prev, [damId]: { ...existing, liveFoalGuarantee } };
    });
  }, []);

  const clearMare = useCallback((damId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[damId];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setAssignments({});
  }, []);

  const autoAssign = useCallback(() => {
    setAssignments((prev) => {
      const next = { ...prev };
      for (const mare of eligibleMares) {
        if (next[mare.id]) continue;
        const suggestions = suggestBestSires(mare, availableStallions, day, 1);
        if (suggestions.length > 0) {
          next[mare.id] = {
            damId: mare.id,
            sireId: suggestions[0].stallion.id,
            liveFoalGuarantee: false,
          };
        }
      }
      return next;
    });
  }, [eligibleMares, availableStallions, day]);

  const confirmAll = useCallback(() => {
    const entries = Object.values(assignments);
    if (entries.length === 0) return { ok: false as const, reason: "No assignments to confirm." };
    const result = breedBatch(entries);
    if (result.ok) {
      setAssignments({});
    }
    return result;
  }, [assignments, breedBatch]);

  const savePlan = useCallback(
    (name: string) => {
      const entries = Object.values(assignments);
      return saveMatingPlan(name, entries);
    },
    [assignments, saveMatingPlan],
  );

  const loadPlan = useCallback(
    (planId: string) => {
      const plan = getSavedMatingPlan(planId);
      if (!plan) return;
      const eligibleIds = new Set(eligibleMares.map((m) => m.id));
      const next: Record<string, MatingPlanEntry> = {};
      for (const entry of plan.entries) {
        if (eligibleIds.has(entry.damId)) {
          next[entry.damId] = entry;
        }
      }
      setAssignments(next);
    },
    [getSavedMatingPlan, eligibleMares],
  );

  const deletePlan = useCallback(
    (planId: string) => {
      deleteMatingPlan(planId);
    },
    [deleteMatingPlan],
  );

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
