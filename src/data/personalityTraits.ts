/**
 * personalityTraits.ts - Personality trait lookup tables
 *
 * Extracted from personalitySystem.ts and stableConfig.ts to centralize
 * personality-related data constants.
 *
 * Dependencies: @/game/types (StablePersonality, StableTier)
 */

import type { StablePersonality, StableTier } from "@/game/types";

/**
 * Strategy alternatives mapping for strategy switching logic.
 * Used by the personality AI system when a strategy is underperforming.
 */
export const STRATEGY_ALTERNATIVES: Record<string, string> = {
  default: "aggressive",
  aggressive: "conservative",
  conservative: "balanced",
  balanced: "innovative",
  innovative: "default",
};

/**
 * Tier-based personality weights (higher = more likely when generating a stable).
 */
export const PERSONALITY_WEIGHTS: Record<StableTier, Partial<Record<StablePersonality, number>>> = {
  elite: {
    prestige: 3,
    aggressive: 2,
    "win-now": 2,
    specialist: 1,
    conservative: 1,
    developer: 1,
    breeder: 2,
    trader: 0.5,
  },
  mid: {
    aggressive: 2,
    "win-now": 2,
    specialist: 2,
    conservative: 2,
    developer: 1.5,
    trader: 1.5,
    prestige: 1,
    breeder: 1,
  },
  budget: {
    conservative: 3,
    developer: 2,
    trader: 2,
    specialist: 1.5,
    aggressive: 0.5,
    prestige: 0.5,
    "win-now": 1,
    breeder: 0.5,
  },
};
