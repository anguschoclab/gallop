/**
 * withdrawalAI.ts - Withdrawal AI system (re-exports + track condition strategies)
 *
 * This file now re-exports types, state creation, value/risk calculation,
 * and recording functions from dedicated modules for backward compatibility.
 * It retains track condition and pattern detection strategies.
 */

import type { Horse } from "@/game/types";

// Re-export types, state creation, value/risk, and recording for backward compatibility
export type { WithdrawalAIState, WithdrawalDecision } from "./withdrawalAITypes";
export { createWithdrawalAIState } from "./withdrawalAITypes";
export { calculateWithdrawalRisk, calculateWithdrawalOpportunityCost } from "./withdrawalAIValue";
export {
  shouldWithdrawHorse,
  isWithdrawalStrategic,
  recordWithdrawalDecision,
  recordWithdrawalOutcome,
  getWithdrawalInsights,
} from "./withdrawalAIRecording";

// ─── Track Condition Aware Withdrawal ────────────────────────────────────────

export function shouldWithdrawForTrackCondition(
  horse: Horse,
  trackCondition: "fast" | "good" | "muddy" | "sloppy",
): boolean {
  if (trackCondition === "fast" || trackCondition === "good") return false;

  if (horse.mudAptitude < 0.3) return true;

  return false;
}

// ─── Consecutive Withdrawal Pattern Detection ────────────────────────────────

export function detectConsecutiveWithdrawalPattern(
  recentWithdrawals: Array<{ withdrew: boolean; reason?: string }>,
): boolean {
  if (recentWithdrawals.length < 3) return false;

  const consecutiveCount = recentWithdrawals.slice(-3).filter((d) => d.withdrew).length;

  if (consecutiveCount >= 3) return true;

  return false;
}
