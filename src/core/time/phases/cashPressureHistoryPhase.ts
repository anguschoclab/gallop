/**
 * phases/cashPressureHistoryPhase.ts - Per-day cash-pressure snapshot phase
 *
 * Runs AFTER impactApplication (order 200) so that end-of-day cash balances are
 * captured. For each NPC stable, evaluates cash pressure and appends a snapshot
 * to `state.cashPressureHistory`, capped at 90 entries per stable. Also prunes
 * histories for stables that no longer exist (bankruptcy dissolution).
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/stable/cashPressure (evaluateCashPressure), @/core/stable/cashPressureHistory (appendCashPressureSnapshot, pruneCashPressureHistory), @/constants (PHASE_ORDER_CASH_PRESSURE_HISTORY)
 * Related files: src/core/time/phases/index.ts (registers phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { evaluateCashPressure } from "@/core/stable/cashPressure";
import {
  appendCashPressureSnapshot,
  pruneCashPressureHistory,
  type CashPressureHistory,
} from "@/core/stable/cashPressureHistory";
import { PHASE_ORDER_CASH_PRESSURE_HISTORY } from "@/constants";

export const cashPressureHistoryPhase: PipelinePhase = {
  name: "cashPressureHistory",
  order: PHASE_ORDER_CASH_PRESSURE_HISTORY,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const stables = state.npcStables ?? [];
    if (stables.length === 0) return context;

    // Start from existing history or lazily initialize
    let history: CashPressureHistory =
      (state.cashPressureHistory as CashPressureHistory | undefined) ?? {};

    // Prune histories for dissolved stables
    const liveIds = new Set(stables.map((s) => s.id));
    history = pruneCashPressureHistory(history, liveIds);

    // Append a snapshot for each live stable
    for (const stable of stables) {
      const cp = evaluateCashPressure(stable, stable.horses.length);
      history = appendCashPressureSnapshot(history, stable.id, {
        day: newDay,
        pressure: cp.pressure,
        meter: cp.meter,
        runwayDays: cp.runwayDays,
        label: cp.label,
      });
    }

    return {
      ...context,
      state: {
        ...state,
        cashPressureHistory: history,
      },
    };
  },
};
