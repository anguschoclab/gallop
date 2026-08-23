/**
 * withdrawalAI.ts - Withdrawal AI system (track condition strategies)
 *
 * Track condition and pattern detection strategies.
 * Types, state creation, value/risk, and recording in dedicated child modules.
 */

import type { Horse } from "@/game/types";

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
