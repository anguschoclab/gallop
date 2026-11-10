/**
 * useMatingAssignments.ts - Dam→sire assignment state for the season planner
 *
 * Owns the assignments map plus its mutation helpers and the auto-assign
 * helper that fills unassigned mares from the suggestion engine.
 */
import { useCallback, useState } from "react";
import type { Horse } from "@/platform/game/types";
import type { MatingPlanEntry } from "@/platform/game/store/state/breedingState";
import { suggestBestSires } from "@/domains/breeding/simulation/sireSuggestions";

interface UseMatingAssignmentsArgs {
  eligibleMares: Horse[];
  availableStallions: Horse[];
  day: number;
}

export function useMatingAssignments({
  eligibleMares,
  availableStallions,
  day,
}: UseMatingAssignmentsArgs) {
  const [assignments, setAssignments] = useState<Record<string, MatingPlanEntry>>({});

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

  return {
    assignments,
    setAssignments,
    assignedCount,
    setSireForMare,
    setLFGForMare,
    clearMare,
    clearAll,
    autoAssign,
  };
}
