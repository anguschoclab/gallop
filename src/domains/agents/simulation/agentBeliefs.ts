/**
 * agentBeliefs.ts - Typed belief model for NPC agents
 *
 * Agents act on beliefs, not omniscient state. A `Belief` pairs a value with
 * `confidence` (0-1) and `observedDay` so downstream planning can weight
 * fresh, high-confidence intel differently from stale guesses. Beliefs are
 * refreshed from the daily `NpcObservation` snapshot and decay as they age.
 *
 * Personality modulates confidence: decisive personalities commit harder to
 * fresh observations; cautious personalities discount them.
 *
 * Dependencies: @/game/types (Stable), ./npcCycleAI (StableAIState typing only), ./agentObservation (NpcObservation)
 * Related files: npc/intentGenerators.ts (refresh callsite), agentGoals.ts (goal derivation consumes beliefs)
 */

import type { Stable } from "@/game/types";
import type { NpcObservation } from "./agentObservation";
import type { WorldAssessment } from "./strategicCoordinator";

/** Where a belief's value came from. */
export type BeliefSource = "self" | "observation" | "inference";

/**
 * A single typed belief: a value plus epistemic metadata.
 */
export interface Belief<T> {
  value: T;
  /** 0-1 — how strongly the agent trusts this belief. */
  confidence: number;
  /** Day the underlying fact was observed. */
  observedDay: number;
  source: BeliefSource;
}

/** Public estimate of a rival stable's strength. */
export interface RivalAssessment {
  /** Estimated bankroll (never exact — rivals' cash is private). */
  estimatedCash: number;
  reputation: number;
  tier: Stable["tier"];
  /** Whether the agent considers this rival an active threat. */
  isThreat: boolean;
}

/** Beliefs about the agent's own position — near-certain (self knowledge). */
export interface SelfAssessment {
  cash: number;
  rosterSize: number;
  distressLevel: string;
}

/**
 * The bounded belief store persisted on `StableAIState`.
 */
export interface AgentBeliefs {
  /** Last day beliefs were refreshed from observation. */
  updatedDay: number;
  /** Belief about the overall economy (bullish → 1, bearish → -1 scale). */
  economicOutlook: Belief<number>;
  /** Belief about the player's competitive strength (0-1 dominance). */
  playerDominance: Belief<number>;
  /** Self assessment — always high confidence (own books are known). */
  self: Belief<SelfAssessment>;
  /** Beliefs about each rival stable, keyed by stable id. Bounded. */
  rivals: Record<string, Belief<RivalAssessment>>;
}

/** Rival belief entries are capped so long saves stay bounded. */
export const MAX_RIVAL_BELIEFS = 32;

/** Confidence halves roughly every `BELIEF_HALF_LIFE_DAYS` without refresh. */
const BELIEF_HALF_LIFE_DAYS = 30;

/**
 * Base confidence for a fresh observation, modulated by personality.
 * Decisive personalities commit harder; conservative/cautious ones discount.
 * @param personality
 */
function baseConfidence(personality: Stable["personality"]): number {
  switch (personality) {
    case "aggressive":
    case "win-now":
      return 0.85;
    case "conservative":
      return 0.6;
    case "developer":
    case "specialist":
      return 0.7;
    case "breeder":
    case "trader":
    case "prestige":
    default:
      return 0.75;
  }
}

/**
 * Effective confidence of a belief on `day`, after freshness decay.
 * @param belief
 * @param day
 */
export function beliefConfidence<T>(belief: Belief<T>, day: number): number {
  const ageDays = Math.max(0, day - belief.observedDay);
  const decay = Math.pow(0.5, ageDays / BELIEF_HALF_LIFE_DAYS);
  return Math.round(belief.confidence * decay * 1000) / 1000;
}

/**
 * Days since a belief was last observed.
 * @param belief
 * @param day
 */
export function beliefFreshnessDays<T>(belief: Belief<T>, day: number): number {
  return Math.max(0, day - belief.observedDay);
}

/**
 * Derive a fresh belief set from the day's observation snapshot.
 *
 * Only observable data may enter beliefs — this function takes an
 * `NpcObservation`, never raw `GameState`.
 * @param observation - The stable's bounded world view
 * @param stable - The acting stable (public profile)
 * @param assessment - Shared world assessment product (may be absent)
 * @param day - Current day
 * @param distressLevel - The stable's computed distress level for the self belief
 * @param previous - Prior beliefs for carry-over of anything unobserved today
 */
export function deriveBeliefs(
  observation: NpcObservation,
  stable: Stable,
  assessment: WorldAssessment | undefined,
  day: number,
  distressLevel: string = "healthy",
  previous?: AgentBeliefs,
): AgentBeliefs {
  const confidence = baseConfidence(stable.personality);

  const economicOutlook: Belief<number> = {
    // yearlingPriceIndex is base-100; normalize to a -1..1 outlook.
    value: assessment
      ? Math.max(-1, Math.min(1, (assessment.economicTrends.yearlingPriceIndex - 100) / 50))
      : 0,
    confidence: assessment ? confidence : 0.4,
    observedDay: day,
    source: assessment ? "observation" : "inference",
  };

  const playerDominance: Belief<number> = {
    value: assessment?.playerDominance ?? previous?.playerDominance.value ?? 0.5,
    confidence: assessment ? confidence : 0.4,
    observedDay: day,
    source: assessment ? "observation" : "inference",
  };

  const rivals: Record<string, Belief<RivalAssessment>> = {};
  for (const rival of observation.npcStables) {
    if (rival.id === stable.id) continue;
    rivals[rival.id] = {
      value: {
        estimatedCash: rival.cash, // already a public estimate in the observation
        reputation: rival.reputation,
        tier: rival.tier,
        isThreat: rival.reputation > stable.reputation,
      },
      confidence,
      observedDay: day,
      source: "observation",
    };
  }
  // Carry over rivals not present in today's observation (bounded).
  if (previous) {
    for (const [id, belief] of Object.entries(previous.rivals)) {
      if (!(id in rivals) && Object.keys(rivals).length < MAX_RIVAL_BELIEFS) {
        rivals[id] = belief;
      }
    }
  }
  // Bound: drop the stalest rivals first.
  const entries = Object.entries(rivals);
  if (entries.length > MAX_RIVAL_BELIEFS) {
    entries
      .sort((a, b) => a[1].observedDay - b[1].observedDay)
      .slice(0, entries.length - MAX_RIVAL_BELIEFS)
      .forEach(([id]) => delete rivals[id]);
  }

  const ownedHorses = Object.values(observation.horses).filter(
    (h) => h.ownership?.type === "npc" && h.ownership.stableId === stable.id,
  );

  const self: Belief<SelfAssessment> = {
    value: {
      cash: stable.cash,
      rosterSize: ownedHorses.length,
      distressLevel,
    },
    confidence: 1,
    observedDay: day,
    source: "self",
  };

  return { updatedDay: day, economicOutlook, playerDominance, self, rivals };
}

/**
 * Age an existing belief set forward to `day` without new observations.
 * Used when a stable skips a refresh — confidence decays, values persist.
 * @param beliefs
 * @param day
 */
export function decayBeliefs(beliefs: AgentBeliefs, day: number): AgentBeliefs {
  return { ...beliefs, updatedDay: day };
}
