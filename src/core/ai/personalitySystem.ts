/**
 * Personality AI System
 * Core utility scoring and configuration for NPC stable personalities
 */

import type { Stable } from "@/game/types";

export type StablePersonality =
  | "aggressive"
  | "conservative"
  | "balanced"
  | "win-now"
  | "prestige"
  | "frugal";

export interface PersonalityConfig {
  personality: StablePersonality;
  riskTolerance: number; // 0-1
  conservatism: number; // 0-1
  ambition: number; // 0-1
  patience: number; // 0-1
  prestigeFocus: number; // 0-1
  adaptationSpeed: number; // 0-1
  memoryDepth: number; // number of decisions to remember
  utilityWeights: Record<string, Record<string, number>>;
  strategyConfidence: number; // 0-1
}

export interface PersonalityAIState extends PersonalityConfig {
  stableId: string;
  lastUpdate: number;
  successRates: Record<string, number>;
}

export const PERSONALITY_MAP: Record<StablePersonality, PersonalityConfig> = {
  aggressive: {
    personality: "aggressive",
    riskTolerance: 0.8,
    conservatism: 0.2,
    ambition: 0.9,
    patience: 0.3,
    prestigeFocus: 0.7,
    adaptationSpeed: 0.6,
    memoryDepth: 50,
    strategyConfidence: 0.7,
    utilityWeights: {
      training: { energy: -0.2, deficiency: 0.5, ambition: 0.3 },
      claiming: { value_ratio: 0.4, risk: -0.2, ambition: 0.4 },
      auction_valuation: { horse_rating: 0.5, stable_cash: -0.1, ambition: 0.4 },
      jockey_selection: { jockey_skill: 0.6, fee: -0.2, ambition: 0.2 },
    },
  },
  conservative: {
    personality: "conservative",
    riskTolerance: 0.3,
    conservatism: 0.8,
    ambition: 0.4,
    patience: 0.8,
    prestigeFocus: 0.4,
    adaptationSpeed: 0.3,
    memoryDepth: 100,
    strategyConfidence: 0.5,
    utilityWeights: {
      training: { energy: 0.5, deficiency: 0.3, patience: 0.2 },
      claiming: { value_ratio: 0.6, risk: -0.5, patience: -0.1 },
      auction_valuation: { horse_rating: 0.4, stable_cash: 0.4, risk: -0.2 },
      jockey_selection: { jockey_skill: 0.4, fee: 0.5, patience: 0.1 },
    },
  },
  balanced: {
    personality: "balanced",
    riskTolerance: 0.5,
    conservatism: 0.5,
    ambition: 0.6,
    patience: 0.5,
    prestigeFocus: 0.5,
    adaptationSpeed: 0.5,
    memoryDepth: 75,
    strategyConfidence: 0.6,
    utilityWeights: {
      training: { energy: 0.1, deficiency: 0.4, ambition: 0.2 },
      claiming: { value_ratio: 0.5, risk: -0.3, ambition: 0.2 },
      auction_valuation: { horse_rating: 0.5, stable_cash: 0.2, ambition: 0.3 },
      jockey_selection: { jockey_skill: 0.5, fee: 0.3, ambition: 0.2 },
    },
  },
  "win-now": {
    personality: "win-now",
    riskTolerance: 0.7,
    conservatism: 0.3,
    ambition: 0.8,
    patience: 0.2,
    prestigeFocus: 0.6,
    adaptationSpeed: 0.8,
    memoryDepth: 30,
    strategyConfidence: 0.8,
    utilityWeights: {
      training: { energy: -0.1, deficiency: 0.6, ambition: 0.5 },
      claiming: { value_ratio: 0.3, risk: -0.1, ambition: 0.6 },
      auction_valuation: { horse_rating: 0.6, stable_cash: -0.2, ambition: 0.6 },
      jockey_selection: { jockey_skill: 0.8, fee: -0.4, ambition: 0.6 },
    },
  },
  prestige: {
    personality: "prestige",
    riskTolerance: 0.6,
    conservatism: 0.4,
    ambition: 0.7,
    patience: 0.6,
    prestigeFocus: 0.9,
    adaptationSpeed: 0.4,
    memoryDepth: 80,
    strategyConfidence: 0.7,
    utilityWeights: {
      training: { energy: 0.2, deficiency: 0.3, prestigeFocus: 0.5 },
      claiming: { value_ratio: 0.2, risk: -0.3, prestigeFocus: 0.5 },
      auction_valuation: { horse_rating: 0.4, stable_cash: 0.1, prestigeFocus: 0.5 },
      jockey_selection: { jockey_skill: 0.7, fee: -0.1, prestigeFocus: 0.4 },
    },
  },
  frugal: {
    personality: "frugal",
    riskTolerance: 0.2,
    conservatism: 0.9,
    ambition: 0.3,
    patience: 0.7,
    prestigeFocus: 0.2,
    adaptationSpeed: 0.2,
    memoryDepth: 150,
    strategyConfidence: 0.4,
    utilityWeights: {
      training: { energy: 0.4, deficiency: 0.2, patience: 0.4 },
      claiming: { value_ratio: 0.8, risk: -0.4, stable_cash: 0.6 },
      auction_valuation: { horse_rating: 0.3, stable_cash: 0.8, risk: -0.3 },
      jockey_selection: { jockey_skill: 0.2, fee: 0.8, patience: 0.2 },
    },
  },
};

/**
 * Get AI state for a personality type
 */
export function getPersonalityAIState(personality: StablePersonality): PersonalityConfig {
  return PERSONALITY_MAP[personality] || PERSONALITY_MAP.balanced;
}

/**
 * Calculate utility score based on personality weights and factors
 */
export function calculateUtilityScore(
  config: PersonalityConfig,
  decisionType: string,
  factors: Record<string, number>,
): number {
  const weights = config.utilityWeights[decisionType];
  if (!weights) return 50; // Default middle score

  let score = 0;
  let totalWeight = 0;

  for (const factor in weights) {
    const weight = weights[factor];
    const value = factors[factor] || 0;
    score += value * weight;
    totalWeight += Math.abs(weight);
  }

  // Normalize and scale to 0-100
  const normalized = totalWeight > 0 ? score / totalWeight : 0.5;
  return Math.max(0, Math.min(100, normalized * 100));
}
