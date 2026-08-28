/**
 * syndicationTrace.ts - Decision trace for NPC syndicate share purchases.
 *
 * Records how personality appetite, proven quality (G1 wins) and available cash
 * combine into the final stake, and logs it in dev/test builds only.
 */

import type { StablePersonality } from "@/game/types";
import type { SyndicationAppetite } from "./syndicationAppetite";

export type SyndicatePurchaseOutcome =
  | "buy"
  | "buy_control"
  | "skip_stake_cap"
  | "skip_quality_gate"
  | "skip_price"
  | "skip_unaffordable";

export interface SyndicatePurchaseTrace {
  stableId: string;
  personality: StablePersonality;
  syndicateId: string;
  stallionId: string;
  appetite: SyndicationAppetite;
  cash: number;
  sharePrice: number;
  totalShares: number;
  currentShares: number;
  /** stakeCapPct × totalShares × qualityStakeScale (clamped at totalShares) */
  maxShares: number;
  availableShares: number;
  g1Wins: number;
  g2Wins: number;
  g3Wins: number;
  minG1Wins: number;
  minG2Wins: number;
  minG3Wins: number;
  /** Weighted graded-win score driving the tier. */
  qualityScore: number;
  /** Tier label (base / proven / elite / legendary). */
  qualityTier: string;
  /** Stake-cap multiplier from the quality tier. */
  qualityStakeScale: number;
  /** cash × cashFraction */
  budget: number;
  maxAffordable: number;
  /** min(availableShares, maxAffordable) before buyFraction is applied */
  candidateShares: number;
  takeoverShares: number;
  outcome: SyndicatePurchaseOutcome;
  shares: number;
}

function isTraceEnabled(): boolean {
  try {
    if (typeof process !== "undefined" && process.env) {
      if (process.env.NODE_ENV === "production") return false;
      if (process.env.VITEST) return process.env.SYNDICATE_TRACE === "1";
      if (process.env.NODE_ENV === "test") return process.env.SYNDICATE_TRACE === "1";
    }
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

const recentTraces: SyndicatePurchaseTrace[] = [];
const MAX_TRACES = 100;

/**
 * Human-readable one-line summary of how the stake was derived.
 * @param t
 */
export function formatSyndicatePurchaseTrace(t: SyndicatePurchaseTrace): string {
  return [
    `[syndicate] ${t.stableId} (${t.personality}) → ${t.stallionId}`,
    `outcome=${t.outcome} shares=${t.shares}`,
    `stakeCap=${(t.appetite.stakeCapPct * 100).toFixed(0)}% (max ${t.maxShares}, held ${t.currentShares}, available ${t.availableShares})`,
    `quality: G1 ${t.g1Wins}/${t.minG1Wins} · G2 ${t.g2Wins}/${t.minG2Wins} · G3 ${t.g3Wins}/${t.minG3Wins} → score ${t.qualityScore} (${t.qualityTier}, ×${t.qualityStakeScale})`,
    `cash=${Math.round(t.cash)} × ${(t.appetite.cashFraction * 100).toFixed(0)}% = budget ${Math.round(t.budget)} @ ${Math.round(t.sharePrice)}/share → affordable ${t.maxAffordable}`,
    `buyFraction=${(t.appetite.buyFraction * 100).toFixed(0)}% of ${t.candidateShares}`,
    t.takeoverShares > 0 ? `control needs ${t.takeoverShares}` : "no control path",
  ].join(" | ");
}

export function recordSyndicatePurchaseTrace(trace: SyndicatePurchaseTrace): void {
  if (!isTraceEnabled()) return;
  recentTraces.push(trace);
  if (recentTraces.length > MAX_TRACES) recentTraces.shift();
  console.debug(formatSyndicatePurchaseTrace(trace));
}

/** Most recent traces (dev tooling / tests). */
export function getRecentSyndicatePurchaseTraces(): SyndicatePurchaseTrace[] {
  return [...recentTraces];
}

export function clearSyndicatePurchaseTraces(): void {
  recentTraces.length = 0;
}
