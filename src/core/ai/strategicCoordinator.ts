/**
 * strategicCoordinator.ts - Cross-system AI coordination layer
 *
 * Sits above the 18 NPC AI subsystems and provides:
 * - World State Assessment: aggregates global game state into a structured assessment
 * - Strategic Directives: per-stable high-level goals that weight subsystem decisions
 * - Cross-System Budgeting: unified budget allocation across all subsystems
 * - Subsystem Coordination: weights that adjust subsystem decision thresholds
 *
 * Dependencies: @/game/types (GameState, Stable, StablePersonality, Race), @/core/ai/npcCycleAI (NpcAIManager), @/core/stable/stableConfig (PERSONALITY_CONFIG)
 * Related files: npc/intentGenerators.ts (calls coordinator before generating intents)
 */

import type { GameState, Stable, StablePersonality, Race } from "@/game/types";
import type { NpcAIManager } from "./npcCycleAI";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EconomicTrend {
  studFeeTrend: number; // % change season-over-season
  yearlingPriceIndex: number; // Average yearling price trend (base 100)
  claimingMarketActivity: number; // Volume of claims in recent period
}

export interface UpcomingMajorRace {
  raceId: string;
  name: string;
  day: number;
  grade: string;
  purse: number;
}

export interface WorldAssessment {
  playerDominance: number; // 0-1, how dominant the player is
  regionalPowerBalance: Record<string, number>; // region -> NPC share (0-1, player = 1-share)
  economicTrends: EconomicTrend;
  breedingMarketSaturation: number; // 0-1, how saturated the foal market is
  upcomingMajorRaces: UpcomingMajorRace[];
}

export type DirectiveType =
  | "aggressive_expansion"
  | "expansion"
  | "defensive"
  | "cost_cutting"
  | "breeding_expansion"
  | "breeding_focus"
  | "racing_focus"
  | "market_speculation"
  | "consolidation";

export interface StrategicDirective {
  type: DirectiveType;
  priority: number; // 1 = highest
  weight: number; // 0-1, influence strength
}

export interface BudgetAllocation {
  total: number;
  training: number;
  facilities: number;
  auctions: number;
  claiming: number;
  breeding: number;
}

export interface SubsystemWeights {
  raceEntry: number;
  training: number;
  auction: number;
  claiming: number;
  breeding: number;
  facility: number;
  market: number;
  upkeep: number;
}

// ─── World State Assessment ──────────────────────────────────────────────────

/**
 * Assess the global game state and produce a structured WorldAssessment.
 *
 * Aggregates player dominance, regional power balance, economic trends,
 * breeding market saturation, and upcoming major races.
 *
 * @param state - Current game state
 * @param manager - NPC AI manager with regional kings
 * @returns Structured world assessment
 */
export function assessWorldState(state: GameState, manager: NpcAIManager): WorldAssessment {
  const allHorses = Object.values(state.horses);
  const npcStables = state.npcStables ?? [];

  // Player dominance: share of total horse count + cash relative to all stables
  const playerHorses = allHorses.filter((h) => !h.stableId || h.stableId === "player");
  const npcHorses = allHorses.filter((h) => h.stableId && h.stableId !== "player");
  const totalHorses = allHorses.length || 1;
  const horseShare = playerHorses.length / totalHorses;

  const totalNpcCash = npcStables.reduce((sum, s) => sum + s.cash, 0);
  const totalCash = state.cash + totalNpcCash || 1;
  const cashShare = state.cash / totalCash;

  const playerDominance = Math.min(1, horseShare * 0.6 + cashShare * 0.4);

  // Regional power balance: fraction of regions controlled by NPCs vs player
  const regionalKings = manager.regionalKings ?? {};
  const totalRegions = Object.keys(regionalKings).length || 1;
  const playerRegions = Object.values(regionalKings).filter((id) => id === "player").length;
  const regionalPowerBalance: Record<string, number> = {};
  for (const [region, kingId] of Object.entries(regionalKings)) {
    regionalPowerBalance[region] = kingId === "player" ? 0 : 1;
  }
  // If no regions tracked, use a default balance
  if (totalRegions === 1 && Object.keys(regionalPowerBalance).length === 0) {
    regionalPowerBalance["default"] = 0.5;
  }

  // Economic trends (placeholder — will be fed by economyAI in Phase 5)
  const economicTrends: EconomicTrend = {
    studFeeTrend: 0,
    yearlingPriceIndex: 100,
    claimingMarketActivity: 0,
  };

  // Breeding market saturation: ratio of pregnant mares to total mares
  const pregnancies = (state as unknown as { pregnancies?: unknown[] }).pregnancies ?? [];
  const mares = allHorses.filter((h) => h.gender === "filly" || h.gender === "mare");
  const breedingMarketSaturation =
    mares.length > 0 ? Math.min(1, pregnancies.length / mares.length) : 0;

  // Upcoming major races (G1/G2 within next 30 days)
  const currentDay = state.day;
  const allRaces = Object.values(state.races);
  const upcomingMajorRaces: UpcomingMajorRace[] = allRaces
    .filter((r) => {
      if (r.resolved) return false;
      if (!r.graded) return false;
      const grade = r.graded.grade;
      if (grade !== "G1" && grade !== "G2") return false;
      const dayDiff = r.day - currentDay;
      return dayDiff >= 0 && dayDiff <= 30;
    })
    .map((r) => ({
      raceId: r.id,
      name: r.name,
      day: r.day,
      grade: r.graded!.grade,
      purse: r.purse,
    }))
    .sort((a, b) => a.day - b.day);

  return {
    playerDominance,
    regionalPowerBalance,
    economicTrends,
    breedingMarketSaturation,
    upcomingMajorRaces,
  };
}

// ─── Strategic Directives ────────────────────────────────────────────────────

/**
 * Generate strategic directives for a stable based on world assessment and personality.
 *
 * @param stable - The NPC stable
 * @param worldAssessment - Current world assessment
 * @param personality - Stable personality
 * @returns Array of strategic directives ordered by priority
 */
export function generateStrategicDirectives(
  stable: Stable,
  worldAssessment: WorldAssessment,
  personality: StablePersonality,
): StrategicDirective[] {
  const directives: StrategicDirective[] = [];
  const { playerDominance, breedingMarketSaturation, economicTrends } = worldAssessment;

  switch (personality) {
    case "aggressive":
      if (playerDominance < 0.5) {
        directives.push({ type: "aggressive_expansion", priority: 1, weight: 1.0 });
      } else {
        directives.push({ type: "expansion", priority: 1, weight: 0.7 });
        directives.push({ type: "racing_focus", priority: 2, weight: 0.6 });
      }
      break;

    case "conservative":
      if (playerDominance > 0.6) {
        directives.push({ type: "defensive", priority: 1, weight: 1.0 });
        directives.push({ type: "cost_cutting", priority: 2, weight: 0.5 });
      } else {
        directives.push({ type: "consolidation", priority: 1, weight: 0.6 });
      }
      break;

    case "breeder":
      if (breedingMarketSaturation < 0.5) {
        directives.push({ type: "breeding_expansion", priority: 1, weight: 1.0 });
      } else {
        directives.push({ type: "breeding_focus", priority: 1, weight: 0.7 });
      }
      if (economicTrends.yearlingPriceIndex > 110) {
        directives.push({ type: "market_speculation", priority: 2, weight: 0.4 });
      }
      break;

    case "win-now":
      directives.push({ type: "racing_focus", priority: 1, weight: 1.0 });
      if (playerDominance > 0.6) {
        directives.push({ type: "aggressive_expansion", priority: 2, weight: 0.5 });
      }
      break;

    case "developer":
      directives.push({ type: "breeding_focus", priority: 1, weight: 0.6 });
      directives.push({ type: "racing_focus", priority: 2, weight: 0.5 });
      break;

    case "trader":
      directives.push({ type: "market_speculation", priority: 1, weight: 0.8 });
      if (playerDominance < 0.4) {
        directives.push({ type: "expansion", priority: 2, weight: 0.5 });
      }
      break;

    case "prestige":
      directives.push({ type: "racing_focus", priority: 1, weight: 0.9 });
      if (breedingMarketSaturation < 0.3) {
        directives.push({ type: "breeding_expansion", priority: 2, weight: 0.4 });
      }
      break;

    case "specialist":
      directives.push({ type: "racing_focus", priority: 1, weight: 0.7 });
      directives.push({ type: "consolidation", priority: 2, weight: 0.4 });
      break;
  }

  return directives.sort((a, b) => a.priority - b.priority);
}

// ─── Budget Allocation ───────────────────────────────────────────────────────

// Budget allocation percentages per personality (must sum to 1.0)
const PERSONALITY_BUDGET_SPLIT: Record<StablePersonality, Omit<BudgetAllocation, "total">> = {
  aggressive: { training: 0.2, facilities: 0.1, auctions: 0.35, claiming: 0.2, breeding: 0.15 },
  conservative: { training: 0.25, facilities: 0.2, auctions: 0.1, claiming: 0.1, breeding: 0.35 },
  developer: { training: 0.25, facilities: 0.15, auctions: 0.15, claiming: 0.1, breeding: 0.35 },
  "win-now": { training: 0.3, facilities: 0.1, auctions: 0.25, claiming: 0.15, breeding: 0.2 },
  specialist: { training: 0.3, facilities: 0.15, auctions: 0.15, claiming: 0.1, breeding: 0.3 },
  breeder: { training: 0.15, facilities: 0.15, auctions: 0.15, claiming: 0.05, breeding: 0.5 },
  trader: { training: 0.15, facilities: 0.1, auctions: 0.2, claiming: 0.4, breeding: 0.15 },
  prestige: { training: 0.2, facilities: 0.15, auctions: 0.2, claiming: 0.1, breeding: 0.35 },
};

// Budget as fraction of total cash (not 100% — stables need reserves)
const BUDGET_CASH_FRACTION = 0.4;

/**
 * Allocate a cross-system budget for a stable based on directives and personality.
 *
 * @param stable - The NPC stable
 * @param directives - Active strategic directives
 * @returns Budget allocation across all subsystems
 */
export function allocateBudget(stable: Stable, directives: StrategicDirective[]): BudgetAllocation {
  const config = PERSONALITY_CONFIG[stable.personality];
  const baseSplit = PERSONALITY_BUDGET_SPLIT[stable.personality];

  // Base total budget is a fraction of available cash
  let totalBudget = stable.cash * BUDGET_CASH_FRACTION;

  // Adjust total based on directives
  for (const directive of directives) {
    switch (directive.type) {
      case "aggressive_expansion":
      case "expansion":
        totalBudget *= 1 + 0.2 * directive.weight;
        break;
      case "defensive":
      case "cost_cutting":
      case "consolidation":
        totalBudget *= 1 - 0.2 * directive.weight;
        break;
    }
  }

  // Clamp to available cash
  totalBudget = Math.min(totalBudget, stable.cash);

  // Apply directive-based adjustments to split
  const adjustedSplit = { ...baseSplit };
  for (const directive of directives) {
    switch (directive.type) {
      case "aggressive_expansion":
      case "expansion":
        adjustedSplit.auctions += 0.05 * directive.weight;
        adjustedSplit.claiming += 0.03 * directive.weight;
        adjustedSplit.breeding -= 0.04 * directive.weight;
        adjustedSplit.training -= 0.04 * directive.weight;
        break;
      case "breeding_expansion":
      case "breeding_focus":
        adjustedSplit.breeding += 0.1 * directive.weight;
        adjustedSplit.auctions -= 0.05 * directive.weight;
        adjustedSplit.claiming -= 0.05 * directive.weight;
        break;
      case "defensive":
      case "cost_cutting":
        adjustedSplit.facilities += 0.05 * directive.weight;
        adjustedSplit.auctions -= 0.05 * directive.weight;
        break;
      case "racing_focus":
        adjustedSplit.training += 0.05 * directive.weight;
        adjustedSplit.auctions += 0.03 * directive.weight;
        adjustedSplit.breeding -= 0.08 * directive.weight;
        break;
      case "market_speculation":
        adjustedSplit.claiming += 0.08 * directive.weight;
        adjustedSplit.auctions += 0.04 * directive.weight;
        adjustedSplit.breeding -= 0.12 * directive.weight;
        break;
    }
  }

  // Normalize split to sum to 1
  const splitSum =
    adjustedSplit.training +
    adjustedSplit.facilities +
    adjustedSplit.auctions +
    adjustedSplit.claiming +
    adjustedSplit.breeding;
  if (splitSum > 0) {
    const normalize = 1 / splitSum;
    adjustedSplit.training *= normalize;
    adjustedSplit.facilities *= normalize;
    adjustedSplit.auctions *= normalize;
    adjustedSplit.claiming *= normalize;
    adjustedSplit.breeding *= normalize;
  }

  return {
    total: Math.round(totalBudget),
    training: Math.round(totalBudget * adjustedSplit.training),
    facilities: Math.round(totalBudget * adjustedSplit.facilities),
    auctions: Math.round(totalBudget * adjustedSplit.auctions),
    claiming: Math.round(totalBudget * adjustedSplit.claiming),
    breeding: Math.round(totalBudget * adjustedSplit.breeding),
  };
}

// ─── Subsystem Coordination ──────────────────────────────────────────────────

// Base weights (1.0 = neutral)
const BASE_WEIGHTS: SubsystemWeights = {
  raceEntry: 1.0,
  training: 1.0,
  auction: 1.0,
  claiming: 1.0,
  breeding: 1.0,
  facility: 1.0,
  market: 1.0,
  upkeep: 1.0,
};

// Weight adjustments per directive type
const DIRECTIVE_WEIGHT_ADJUSTMENTS: Record<DirectiveType, Partial<SubsystemWeights>> = {
  aggressive_expansion: {
    raceEntry: 0.4,
    auction: 0.3,
    claiming: 0.2,
    breeding: -0.2,
    upkeep: -0.1,
  },
  expansion: {
    raceEntry: 0.2,
    auction: 0.15,
    claiming: 0.1,
    breeding: -0.1,
  },
  defensive: {
    raceEntry: -0.3,
    auction: -0.2,
    claiming: -0.2,
    facility: 0.1,
    upkeep: 0.2,
  },
  cost_cutting: {
    auction: -0.3,
    claiming: -0.1,
    facility: -0.2,
    upkeep: 0.3,
    breeding: -0.1,
  },
  breeding_expansion: {
    breeding: 0.5,
    auction: 0.1,
    raceEntry: -0.1,
    upkeep: -0.1,
  },
  breeding_focus: {
    breeding: 0.3,
    raceEntry: -0.05,
  },
  racing_focus: {
    raceEntry: 0.3,
    training: 0.2,
    breeding: -0.15,
  },
  market_speculation: {
    claiming: 0.3,
    auction: 0.2,
    market: 0.3,
    breeding: -0.2,
  },
  consolidation: {
    raceEntry: -0.1,
    auction: -0.1,
    facility: 0.1,
    upkeep: 0.1,
  },
};

/**
 * Coordinate subsystem weights based on strategic directives and budget.
 *
 * @param directives - Active strategic directives
 * @param _budget - Allocated budget (reserved for future budget-aware weight adjustments)
 * @returns Subsystem weights (0-2, 1.0 = neutral)
 */
export function coordinateSubsystems(
  directives: StrategicDirective[],
  _budget: BudgetAllocation,
): SubsystemWeights {
  const weights: SubsystemWeights = { ...BASE_WEIGHTS };

  for (const directive of directives) {
    const adjustments = DIRECTIVE_WEIGHT_ADJUSTMENTS[directive.type];
    if (!adjustments) continue;

    const magnitude = directive.weight;
    for (const [key, adjustment] of Object.entries(adjustments)) {
      const subsystemKey = key as keyof SubsystemWeights;
      weights[subsystemKey] += adjustment * magnitude;
    }
  }

  // Clamp all weights to [0, 2]
  for (const key of Object.keys(weights) as (keyof SubsystemWeights)[]) {
    weights[key] = Math.max(0, Math.min(2, weights[key]));
  }

  return weights;
}
