/**
 * useCashPressureHistory.ts - Selector hook for a stable's pressure history
 *
 * Dependencies: @/game/store (useGame), @/core/stable/cashPressureHistory (CashPressureSnapshot)
 * Related files: @/components/stable/CashPressureTrend.tsx (consumer)
 */

import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";
import type { CashPressureSnapshot } from "@/core/stable/cashPressureHistory";

const EMPTY_ARRAY: CashPressureSnapshot[] = [];

/**
 * Select the cash-pressure snapshot history for a single stable. Returns a
 * stable empty array reference when no history exists to avoid unnecessary
 * re-renders.
 * @param stableId - The NPC stable ID
 */
export function useCashPressureHistory(stableId: string): CashPressureSnapshot[] {
  return useGame((s: GameState) => s.cashPressureHistory?.[stableId] ?? EMPTY_ARRAY);
}
