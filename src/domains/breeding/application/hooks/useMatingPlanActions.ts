/**
 * useMatingPlanActions.ts - Confirm/save/load/delete actions for the season planner
 *
 * Wires the assignments map to the store's breeding actions: batch breed
 * confirmation, named plan persistence, plan restore (filtered to currently
 * eligible dams), and plan deletion.
 */
import { useCallback } from "react";
import { useGame } from "@/platform/game/store";
import type { Horse } from "@/platform/game/types";
import type { MatingPlanEntry } from "@/platform/game/store/state/breedingState";

interface UseMatingPlanActionsArgs {
  assignments: Record<string, MatingPlanEntry>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, MatingPlanEntry>>>;
  eligibleMares: Horse[];
}

export function useMatingPlanActions({
  assignments,
  setAssignments,
  eligibleMares,
}: UseMatingPlanActionsArgs) {
  const breedBatch = useGame((s) => s.breedBatch);
  const saveMatingPlan = useGame((s) => s.saveMatingPlan);
  const deleteMatingPlan = useGame((s) => s.deleteMatingPlan);
  const getSavedMatingPlan = useGame((s) => s.getSavedMatingPlan);

  const confirmAll = useCallback(() => {
    const entries = Object.values(assignments);
    if (entries.length === 0) return { ok: false as const, reason: "No assignments to confirm." };
    const result = breedBatch(entries);
    if (result.ok) {
      setAssignments({});
    }
    return result;
  }, [assignments, breedBatch, setAssignments]);

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
    [getSavedMatingPlan, eligibleMares, setAssignments],
  );

  const deletePlan = useCallback(
    (planId: string) => {
      deleteMatingPlan(planId);
    },
    [deleteMatingPlan],
  );

  return { confirmAll, savePlan, loadPlan, deletePlan };
}
