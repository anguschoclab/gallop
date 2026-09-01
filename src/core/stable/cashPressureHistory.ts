/**
 * cashPressureHistory.ts - Per-stable cash-pressure snapshot history
 *
 * Stores up to `CASH_PRESSURE_HISTORY_MAX` daily snapshots of each NPC stable's
 * cash-pressure evaluation (pressure, meter, runway days, label) so the UI can
 * render trend sparklines showing when a stable becomes flush or desperate.
 *
 * Dependencies: ./cashPressure (CashPressure)
 * Related files: src/core/time/phases/cashPressureHistoryPhase.ts (consumer),
 *   src/components/stable/CashPressureTrend.tsx (UI consumer)
 */

import type { CashPressure } from "./cashPressure";

export interface CashPressureSnapshot {
  day: number;
  pressure: number;
  meter: number;
  runwayDays: number;
  label: CashPressure["label"];
}

export type CashPressureHistory = Record<string, CashPressureSnapshot[]>;

/** Maximum number of snapshots retained per stable. */
export const CASH_PRESSURE_HISTORY_MAX = 90;

/**
 * Append a snapshot to a stable's history, capping at
 * `CASH_PRESSURE_HISTORY_MAX` (FIFO eviction of oldest entries). Pure: returns
 * a new history object without mutating the input.
 * @param history - Existing history map
 * @param stableId - Stable to append the snapshot for
 * @param snapshot - The snapshot to append
 */
export function appendCashPressureSnapshot(
  history: CashPressureHistory,
  stableId: string,
  snapshot: CashPressureSnapshot,
): CashPressureHistory {
  const existing = history[stableId] ?? [];
  const updated = [...existing, snapshot];
  if (updated.length > CASH_PRESSURE_HISTORY_MAX) {
    return {
      ...history,
      [stableId]: updated.slice(updated.length - CASH_PRESSURE_HISTORY_MAX),
    };
  }
  return { ...history, [stableId]: updated };
}

/**
 * Remove histories for stable IDs that are no longer live (e.g. dissolved via
 * bankruptcy). Pure: returns a new history object without mutating the input.
 * @param history - Existing history map
 * @param liveStableIds - Set of stable IDs still present in the game
 */
export function pruneCashPressureHistory(
  history: CashPressureHistory,
  liveStableIds: Set<string>,
): CashPressureHistory {
  const result: CashPressureHistory = {};
  for (const [id, snapshots] of Object.entries(history)) {
    if (liveStableIds.has(id)) {
      result[id] = snapshots;
    }
  }
  return result;
}
