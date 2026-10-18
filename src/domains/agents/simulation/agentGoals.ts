/**
 * agentGoals.ts - Multi-horizon goal model and plan repair for NPC agents
 *
 * Agents maintain a small ranked set of goals across three horizons:
 * - short  (days):   immediate execution drivers — race entries, training,
 *                    distress response.
 * - medium (weeks):  roster and asset shaping — claiming, consignment,
 *                    insurance cover.
 * - long   (seasons): program direction — breeding program, footprint
 *                    expansion, influence networks.
 *
 * Goals are validated every day against the bounded observation. A goal is
 * invalidated when its enabling condition disappears (e.g. no eligible
 * horses to race, solvency restored, footprint already maximal) or achieved
 * when its terminal condition holds. `repairAgentGoals` then tops each
 * horizon back up from a fresh deterministic derivation — preserving the
 * identity and age of surviving goals so plans have memory.
 *
 * Determinism: derivation and ranking are pure functions of the observation
 * and stable profile; ties break on goal type then id. No RNG.
 *
 * Dependencies: @/game/types (Stable), ./agentObservation (NpcObservation), ./agentBeliefs (AgentBeliefs)
 * Related files: npc/intentGenerators.ts (daily repair callsite), npcActionRegistry.ts (plan linkage)
 */

import type { Stable } from "@/platform/game/types";
import type { NpcObservation } from "./agentObservation";
import type { AgentBeliefs } from "./agentBeliefs";
import type { NpcActionId } from "./npcActionRegistry";

export type GoalHorizon = "short" | "medium" | "long";

export type GoalType =
  | "compete" // enter winnable races
  | "condition_roster" // keep horses trained and fit
  | "acquire_bloodstock" // claiming / auction buying
  | "liquidate_assets" // consign / sell to raise cash
  | "stabilize_finances" // recover from distress
  | "protect_assets" // insurance cover on valuable stock
  | "grow_breeding_program" // long-run bloodstock strategy
  | "expand_footprint" // facilities / outposts
  | "influence_network"; // diplomacy, alliances, cartels

export interface AgentGoal {
  /** Deterministic id: `<type>` — one active goal per type. */
  id: GoalType;
  type: GoalType;
  horizon: GoalHorizon;
  /** 1 = most important within its horizon. */
  rank: number;
  /** Normalized 0-1 desirability from derivation. */
  score: number;
  createdDay: number;
  /** Hard expiry — re-derived rather than silently eternal. */
  validUntilDay: number;
  status: "active" | "achieved" | "invalidated";
  invalidationReason?: string;
  rationale: string;
}

export const GOAL_HORIZON_DAYS: Record<GoalHorizon, number> = {
  short: 7,
  medium: 30,
  long: 180,
};

/** Maximum active goals per horizon — the ranked set stays bounded. */
export const MAX_GOALS_PER_HORIZON: Record<GoalHorizon, number> = {
  short: 3,
  medium: 2,
  long: 2,
};

/** Which registered NPC action primarily serves which goal — plan linkage. */
export const ACTION_GOAL_MAP: Record<NpcActionId, GoalType> = {
  race_entry: "compete",
  withdrawal: "compete",
  training: "condition_roster",
  claiming: "acquire_bloodstock",
  auction_consignment: "liquidate_assets",
  insurance: "protect_assets",
  breeding: "grow_breeding_program",
  facility_upgrade: "expand_footprint",
  outpost: "expand_footprint",
  transport: "expand_footprint",
  diplomacy: "influence_network",
};

/** All goal types each action can serve, primary first. */
export const NPC_ACTION_GOAL_COMPATIBILITY: Record<NpcActionId, GoalType[]> = {
  race_entry: ["compete"],
  withdrawal: ["compete", "protect_assets"],
  training: ["condition_roster"],
  claiming: ["acquire_bloodstock"],
  auction_consignment: ["liquidate_assets", "stabilize_finances"],
  insurance: ["protect_assets"],
  breeding: ["grow_breeding_program", "acquire_bloodstock"],
  facility_upgrade: ["expand_footprint", "stabilize_finances"],
  outpost: ["expand_footprint"],
  transport: ["expand_footprint", "compete"],
  diplomacy: ["influence_network"],
};

/** Inputs required to derive/validate goals — all observable or own data. */
export interface GoalContext {
  observation: NpcObservation;
  stable: Stable;
  beliefs?: AgentBeliefs;
  distressLevel: string;
  ownedHorseCount: number;
  eligibleHorseCount: number;
  day: number;
}

/** Maximum roster size before acquisition goals stop making sense. */
const MAX_SANE_ROSTER = 40;
/** Cash buffer below which financial goals dominate. */
const LOW_CASH_THRESHOLD = 50_000;

interface ScoredGoal {
  type: GoalType;
  horizon: GoalHorizon;
  score: number;
  rationale: string;
}

/**
 * Score every goal type for the current context.
 * Deterministic — same inputs always produce the same ordering.
 * @param ctx
 */
function scoreGoals(ctx: GoalContext): ScoredGoal[] {
  const { stable, distressLevel, ownedHorseCount, eligibleHorseCount, beliefs } = ctx;
  const distressed = distressLevel !== "healthy";
  const lowCash = stable.cash < LOW_CASH_THRESHOLD;
  const economicOutlook = beliefs?.economicOutlook.value ?? 0;
  const personality = stable.personality;

  const goals: ScoredGoal[] = [];

  // Short horizon — what to do in the next few days.
  if (eligibleHorseCount > 0) {
    goals.push({
      type: "compete",
      horizon: "short",
      score:
        0.6 +
        (personality === "aggressive" || personality === "win-now" ? 0.2 : 0) +
        (distressed ? -0.1 : 0),
      rationale: `${eligibleHorseCount} eligible horse(s) and races on the calendar`,
    });
  }
  if (ownedHorseCount > 0) {
    goals.push({
      type: "condition_roster",
      horizon: "short",
      score: 0.55 + (personality === "developer" ? 0.2 : 0),
      rationale: `${ownedHorseCount} horse(s) need conditioning`,
    });
  }
  if (distressed || lowCash) {
    goals.push({
      type: "stabilize_finances",
      horizon: "short",
      score: 0.9 + (distressed ? 0.1 : 0),
      rationale: distressed ? `distress level ${distressLevel}` : "low cash buffer",
    });
  }

  // Medium horizon — roster and risk shaping.
  if (!distressed && ownedHorseCount < MAX_SANE_ROSTER) {
    goals.push({
      type: "acquire_bloodstock",
      horizon: "medium",
      score: 0.5 + (personality === "trader" ? 0.15 : 0) + Math.max(0, economicOutlook) * 0.2,
      rationale: "roster capacity and market conditions allow acquisitions",
    });
  }
  if (distressed || lowCash) {
    goals.push({
      type: "liquidate_assets",
      horizon: "medium",
      score: 0.65 + (distressed ? 0.2 : 0),
      rationale: "raise cash through consignment or sales",
    });
  }
  if (!distressed && ownedHorseCount > 0 && stable.cash > LOW_CASH_THRESHOLD * 2) {
    goals.push({
      type: "protect_assets",
      horizon: "medium",
      score: 0.4 + (personality === "conservative" ? 0.25 : 0),
      rationale: "valuable stock without cover",
    });
  }

  // Long horizon — program direction.
  if (!distressed) {
    goals.push({
      type: "grow_breeding_program",
      horizon: "long",
      score: 0.45 + (personality === "breeder" ? 0.3 : 0) + Math.max(0, economicOutlook) * 0.15,
      rationale: "long-run bloodstock development",
    });
    goals.push({
      type: "expand_footprint",
      horizon: "long",
      score:
        0.4 + (personality === "aggressive" ? 0.15 : 0) + Math.min(0.2, stable.cash / 1_000_000),
      rationale: "facilities and regional footprint",
    });
    goals.push({
      type: "influence_network",
      horizon: "long",
      score: 0.35 + (personality === "prestige" ? 0.2 : 0),
      rationale: "alliances and rival positioning",
    });
  }

  return goals;
}

/**
 * Ranked, capped goal set for a context — the raw derivation with no memory.
 * @param ctx
 */
export function deriveAgentGoals(ctx: GoalContext): AgentGoal[] {
  const scored = scoreGoals(ctx);
  const byHorizon = new Map<GoalHorizon, ScoredGoal[]>();
  for (const goal of scored) {
    const list = byHorizon.get(goal.horizon) ?? [];
    list.push(goal);
    byHorizon.set(goal.horizon, list);
  }

  const result: AgentGoal[] = [];
  for (const [horizon, list] of byHorizon) {
    // Deterministic ranking: score desc, then type asc.
    list.sort((a, b) => b.score - a.score || a.type.localeCompare(b.type));
    const cap = MAX_GOALS_PER_HORIZON[horizon];
    list.slice(0, cap).forEach((g, i) => {
      result.push({
        id: g.type,
        type: g.type,
        horizon,
        rank: i + 1,
        score: Math.round(g.score * 1000) / 1000,
        createdDay: ctx.day,
        validUntilDay: ctx.day + GOAL_HORIZON_DAYS[horizon],
        status: "active",
        rationale: g.rationale,
      });
    });
  }
  return result;
}

/**
 * Why a previously-active goal no longer holds, or `null` if still valid.
 * @param goal
 * @param ctx
 */
function invalidationReason(goal: AgentGoal, ctx: GoalContext): string | null {
  if (ctx.day > goal.validUntilDay) return "expired";
  const distressed = ctx.distressLevel !== "healthy";

  switch (goal.type) {
    case "compete":
      return ctx.eligibleHorseCount === 0 ? "no_eligible_horses" : null;
    case "condition_roster":
      return ctx.ownedHorseCount === 0 ? "empty_roster" : null;
    case "acquire_bloodstock":
      if (ctx.ownedHorseCount >= MAX_SANE_ROSTER) return "roster_full";
      return distressed ? "distress_superseded" : null;
    case "liquidate_assets":
      return !distressed && ctx.stable.cash >= LOW_CASH_THRESHOLD ? "finances_stabilized" : null;
    case "stabilize_finances":
      return !distressed && ctx.stable.cash >= LOW_CASH_THRESHOLD ? "finances_stabilized" : null;
    case "protect_assets":
      return ctx.ownedHorseCount === 0 ? "empty_roster" : distressed ? "distress_superseded" : null;
    case "grow_breeding_program":
    case "expand_footprint":
    case "influence_network":
      return distressed ? "distress_superseded" : null;
    default:
      return null;
  }
}

/**
 * Validate the existing goal set against today's context and repair it:
 * expired/condition-broken goals are marked invalidated, achieved goals are
 * marked achieved (liquidate/stabilize flip to achieved rather than
 * invalidated so history reads truthfully), surviving goals keep their
 * identity and age, and each horizon is topped up from a fresh derivation.
 *
 * Returns the prior array reference when nothing changed so callers keep
 * object identity (cheap retained-world checks).
 * @param existing - Goals persisted on the stable's AI state (may be absent)
 * @param ctx
 */
export function repairAgentGoals(existing: AgentGoal[] | undefined, ctx: GoalContext): AgentGoal[] {
  const fresh = deriveAgentGoals(ctx);
  if (!existing || existing.length === 0) return fresh;

  const freshByType = new Map(fresh.map((g) => [g.type, g]));
  const reconciled: AgentGoal[] = [];
  let changed = false;

  for (const goal of existing) {
    if (goal.status !== "active") {
      // History entries are retained but never re-activated.
      reconciled.push(goal);
      continue;
    }
    const reason = invalidationReason(goal, ctx);
    if (reason) {
      changed = true;
      reconciled.push({
        ...goal,
        status: reason === "finances_stabilized" ? "achieved" : "invalidated",
        invalidationReason: reason,
      });
      continue;
    }
    // Still active: refresh rank/score from today's derivation if the goal is
    // still wanted; otherwise it ages out only via expiry or a rule above.
    const today = freshByType.get(goal.type);
    if (today) {
      if (today.rank !== goal.rank || today.score !== goal.score) changed = true;
      reconciled.push({ ...goal, rank: today.rank, score: today.score });
    } else {
      changed = true;
      reconciled.push({
        ...goal,
        status: "invalidated",
        invalidationReason: "no_longer_desired",
      });
    }
  }

  // Top up: activate fresh goals that have no active/closed entry already.
  const claimedTypes = new Set(reconciled.filter((g) => g.status === "active").map((g) => g.type));
  for (const g of fresh) {
    if (!claimedTypes.has(g.type)) {
      changed = true;
      reconciled.push(g);
    }
  }

  // Bound history: keep the newest 16 non-active entries plus all active.
  const active = reconciled.filter((g) => g.status === "active");
  let history = reconciled.filter((g) => g.status !== "active");
  if (history.length > 16) {
    history = history.slice(-16);
    changed = true;
  }
  if (!changed) return existing;
  return [...active, ...history];
}
