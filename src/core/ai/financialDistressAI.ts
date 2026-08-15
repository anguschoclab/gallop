/**
 * financialDistressAI.ts - Financial distress assessment for NPC stables
 *
 * Provides a 3-tier distress classification (caution, emergency, critical)
 * with personality-aware action recommendations. Designed to be computed
 * early in the pipeline (worldAssessment phase, order 2) so that all
 * downstream phases have access to the distress state.
 *
 * Dependencies: @/game/types (Stable, StablePersonality)
 * Related files: strategicCoordinator.ts (uses distress directive), intentGenerators.ts (uses distress state)
 */

import type { Stable, StablePersonality } from "@/game/types";
import type { StrategicDirective } from "./strategicCoordinator";
import {
  DISTRESS_CAUTION_THRESHOLD,
  DISTRESS_EMERGENCY_THRESHOLD,
  DISTRESS_CRITICAL_THRESHOLD,
  PERSONALITY_EARLY_TRIGGER_DAYS,
  CAUTIOUS_PERSONALITIES,
  AGGRESSIVE_PERSONALITIES,
  DISTRESS_DIRECTIVE_WEIGHT,
  DISTRESS_DIRECTIVE_PRIORITY,
} from "@/constants/financialDistressConstants";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DistressLevel = "healthy" | "caution" | "emergency" | "critical";

export type DistressAction =
  | "reduce_spending"
  | "sell_underperformers"
  | "sell_syndicate_shares"
  | "reduce_stud_fees"
  | "halt_breeding"
  | "halt_claiming"
  | "halt_auction_bidding"
  | "halt_market_purchases"
  | "emergency_consign"
  | "sell_all_shares"
  | "slash_stud_fees";

export interface FinancialDistressState {
  level: DistressLevel;
  daysOfCash: number;
  recommendedActions: DistressAction[];
}

export type SpendingCategory =
  | "claiming"
  | "auction_bidding"
  | "market_purchase"
  | "facility_upgrade"
  | "breeding"
  | "race_entry"
  | "upkeep";

// ─── Constants ───────────────────────────────────────────────────────────────

// Thresholds and personality groups are imported from financialDistressConstants.ts

// ─── Assessment ──────────────────────────────────────────────────────────────

export function assessFinancialDistress(
  stable: Stable,
  dailyUpkeep: number,
): FinancialDistressState {
  const daysOfCash = dailyUpkeep > 0 ? stable.cash / dailyUpkeep : Infinity;

  if (daysOfCash === Infinity || daysOfCash >= DISTRESS_CAUTION_THRESHOLD) {
    return { level: "healthy", daysOfCash, recommendedActions: [] };
  }

  let level: DistressLevel;
  if (daysOfCash < DISTRESS_CRITICAL_THRESHOLD) {
    level = "critical";
  } else if (daysOfCash < DISTRESS_EMERGENCY_THRESHOLD) {
    level = "emergency";
  } else {
    level = "caution";
  }

  const recommendedActions = getRecommendedActions(level, stable.personality);

  return { level, daysOfCash, recommendedActions };
}

function getRecommendedActions(
  level: DistressLevel,
  personality: StablePersonality,
): DistressAction[] {
  const actions: DistressAction[] = [];
  const isCautious = (CAUTIOUS_PERSONALITIES as readonly string[]).includes(personality);
  const isAggressive = (AGGRESSIVE_PERSONALITIES as readonly string[]).includes(personality);

  if (level === "caution") {
    actions.push("reduce_spending");
    actions.push("halt_claiming");
    actions.push("halt_auction_bidding");
    actions.push("halt_market_purchases");
    actions.push("sell_underperformers");
    actions.push("reduce_stud_fees");
    if (!isCautious) {
      actions.push("sell_syndicate_shares");
    }
  } else if (level === "emergency") {
    actions.push("reduce_spending");
    actions.push("halt_claiming");
    actions.push("halt_auction_bidding");
    actions.push("halt_market_purchases");
    actions.push("sell_underperformers");
    actions.push("emergency_consign");
    actions.push("reduce_stud_fees");
    if (isCautious) {
      actions.push("sell_syndicate_shares");
    } else {
      actions.push("sell_all_shares");
    }
  } else if (level === "critical") {
    actions.push("reduce_spending");
    actions.push("halt_claiming");
    actions.push("halt_auction_bidding");
    actions.push("halt_market_purchases");
    actions.push("halt_breeding");
    actions.push("emergency_consign");
    actions.push("sell_all_shares");
    actions.push("slash_stud_fees");
  }

  return actions;
}

export function getEarlyTriggerDays(personality: StablePersonality): number {
  if ((CAUTIOUS_PERSONALITIES as readonly string[]).includes(personality)) {
    return DISTRESS_CAUTION_THRESHOLD + PERSONALITY_EARLY_TRIGGER_DAYS;
  }
  if ((AGGRESSIVE_PERSONALITIES as readonly string[]).includes(personality)) {
    return DISTRESS_CAUTION_THRESHOLD - PERSONALITY_EARLY_TRIGGER_DAYS;
  }
  return DISTRESS_CAUTION_THRESHOLD;
}

export function assessFinancialDistressWithPersonality(
  stable: Stable,
  dailyUpkeep: number,
): FinancialDistressState {
  const daysOfCash = dailyUpkeep > 0 ? stable.cash / dailyUpkeep : Infinity;
  const earlyTrigger = getEarlyTriggerDays(stable.personality);

  if (daysOfCash === Infinity || daysOfCash >= earlyTrigger) {
    return { level: "healthy", daysOfCash, recommendedActions: [] };
  }

  let level: DistressLevel;
  if (daysOfCash < DISTRESS_CRITICAL_THRESHOLD) {
    level = "critical";
  } else if (daysOfCash < DISTRESS_EMERGENCY_THRESHOLD) {
    level = "emergency";
  } else {
    level = "caution";
  }

  const recommendedActions = getRecommendedActions(level, stable.personality);

  return { level, daysOfCash, recommendedActions };
}

// ─── Directive Mapping ───────────────────────────────────────────────────────

export function getDistressDirective(state: FinancialDistressState): StrategicDirective | null {
  if (state.level === "healthy") return null;

  const weight = DISTRESS_DIRECTIVE_WEIGHT[state.level];

  return {
    type: "financial_distress",
    priority: DISTRESS_DIRECTIVE_PRIORITY,
    weight,
  };
}

// ─── Spending Block Check ────────────────────────────────────────────────────

export function shouldBlockSpending(
  state: FinancialDistressState,
  category: SpendingCategory,
): boolean {
  if (state.level === "healthy") return false;

  switch (category) {
    case "race_entry":
    case "upkeep":
      return false;
    case "claiming":
    case "auction_bidding":
    case "market_purchase":
      return true;
    case "facility_upgrade":
      return state.level === "emergency" || state.level === "critical";
    case "breeding":
      return state.level === "critical";
    default:
      return false;
  }
}
