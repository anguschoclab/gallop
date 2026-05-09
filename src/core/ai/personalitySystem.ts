import type { StablePersonality } from "@/game/types";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import {
  createLearningState,
  recordOutcome as recordLearningOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";

/**
 * Hybrid AI Personality System
 * Combines Utility AI scoring, Behavior Trees, Learning System, and Strategic Planning
 */

export interface PersonalityAIState {
  personality: StablePersonality;
  learningRate: number;
  memoryDepth: number;
  adaptationSpeed: number;
  strategicHorizon: number;
  competitiveAwareness: number;
  conservatism: number;
  innovation: number;
  // Learning memory
  learningState: LearningState;
  // Strategic state
  currentStrategy: string;
  strategyConfidence: number;
  lastStrategyChange: number;
}

/**
 * Get AI state for a personality
 */
export function getPersonalityAIState(personality: StablePersonality): PersonalityAIState {
  const config = PERSONALITY_CONFIG[personality];
  return {
    personality,
    learningRate: config.learningRate,
    memoryDepth: config.memoryDepth,
    adaptationSpeed: config.adaptationSpeed,
    strategicHorizon: config.strategicHorizon,
    competitiveAwareness: config.competitiveAwareness,
    conservatism: config.conservatism,
    innovation: config.innovation,
    learningState: createLearningState(),
    currentStrategy: "default",
    strategyConfidence: 0.5,
    lastStrategyChange: 0,
  };
}

/**
 * Utility AI scoring function
 * Calculates utility score for a decision based on personality traits
 */
export function calculateUtilityScore(
  aiState: PersonalityAIState,
  decisionType: string,
  factors: Record<string, number>,
): number {
  const config = PERSONALITY_CONFIG[aiState.personality];
  let score = 0;

  // Apply personality-based weighting to factors
  for (const [factor, value] of Object.entries(factors)) {
    let weight = 1;

    // Risk tolerance affects risky factors
    if (factor.includes("risk") || factor.includes("variance")) {
      weight *= config.riskTolerance;
    }

    // Youth preference affects age-related factors
    if (factor.includes("youth") || factor.includes("age")) {
      weight *= config.youthPreference;
    }

    // Genetic insight affects DNA-related factors
    if (factor.includes("genetic") || factor.includes("pedigree")) {
      weight *= config.geneticInsightMod;
    }

    // Graded race bonus affects stakes factors
    if (factor.includes("graded") || factor.includes("stakes")) {
      weight *= config.gradedRaceBonus / 10;
    }

    score += value * weight;
  }

  // Apply conservatism modifier (reduces score for unfamiliar strategies)
  if (aiState.currentStrategy !== "default" && aiState.strategyConfidence < 0.5) {
    score *= config.conservatism;
  }

  // Apply innovation modifier (boosts score for novel approaches)
  if (decisionType === "novel") {
    score *= 1 + config.innovation * 0.5;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Record a decision outcome for learning
 */
export function recordOutcome(
  aiState: PersonalityAIState,
  decisionType: string,
  context: Record<string, unknown>,
  success: boolean,
  value: number,
  timestamp: number,
  day: number,
): PersonalityAIState {
  const contextKey = getOutcomeKey(decisionType, context);

  // Delegate to learningModule
  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    decisionType,
    contextKey,
    success,
    value,
    timestamp,
    day,
    aiState.memoryDepth,
  );

  const successRate = getSuccessRate(newLearningState, decisionType, contextKey);

  let newState = {
    ...aiState,
    learningState: newLearningState,
  };

  // Adapt strategy if needed
  if (shouldAdaptStrategy(newState, decisionType, contextKey, successRate)) {
    newState = adaptStrategy(newState, decisionType, contextKey, successRate, timestamp);
  }

  return newState;
}

/**
 * Get composite key for outcome tracking
 */
function getOutcomeKey(decisionType: string, context: Record<string, unknown>): string {
  const contextKey = Object.entries(context)
    .filter(([_, v]) => typeof v === "string" || typeof v === "number")
    .map(([k, v]) => `${k}:${v}`)
    .sort()
    .join("|");
  return `${decisionType}:${contextKey}`;
}

/**
 * Determine if strategy should be adapted
 */
function shouldAdaptStrategy(
  aiState: PersonalityAIState,
  decisionType: string,
  contextKey: string,
  successRate: number,
): boolean {
  // Adapt if success rate is low and enough data collected
  const data = aiState.learningState.successRates[`${decisionType}:${contextKey}`];
  if (!data || data.total < 5) return false;

  // Conservative personalities adapt slower
  const threshold = 0.5 - aiState.conservatism * 0.2;
  return successRate < threshold;
}

/**
 * Adapt strategy based on outcomes
 */
function adaptStrategy(
  aiState: PersonalityAIState,
  _decisionType: string,
  _contextKey: string,
  successRate: number,
  timestamp: number,
): PersonalityAIState {
  const config = PERSONALITY_CONFIG[aiState.personality];
  const confidenceChange = (1 - successRate) * config.adaptationSpeed;

  const newConfidence = Math.max(0.1, aiState.strategyConfidence - confidenceChange);

  let currentStrategy = aiState.currentStrategy;
  let finalConfidence = newConfidence;

  // Switch to alternative strategy if confidence is low
  if (newConfidence < 0.3) {
    currentStrategy = getAlternativeStrategy(aiState.currentStrategy);
    finalConfidence = 0.6;
  }

  return {
    ...aiState,
    strategyConfidence: finalConfidence,
    currentStrategy,
    lastStrategyChange: timestamp,
  };
}

/**
 * Get alternative strategy based on current strategy
 */
function getAlternativeStrategy(currentStrategy: string): string {
  const alternatives: Record<string, string> = {
    default: "aggressive",
    aggressive: "conservative",
    conservative: "balanced",
    balanced: "innovative",
    innovative: "default",
  };
  return alternatives[currentStrategy] || "default";
}

/**
 * Get strategic planning score for long-term decisions
 */
export function calculateStrategicScore(
  aiState: PersonalityAIState,
  decision: {
    shortTermValue: number;
    longTermValue: number;
    risk: number;
    novelty: number;
  },
): number {
  const config = PERSONALITY_CONFIG[aiState.personality];

  // Balance short-term vs long-term based on strategic horizon
  const horizonWeight = Math.min(1, aiState.strategicHorizon / 90); // Normalize to 0-1
  const strategicValue =
    decision.shortTermValue * (1 - horizonWeight) + decision.longTermValue * horizonWeight;

  // Apply risk tolerance
  const riskAdjustedValue = strategicValue * (1 - decision.risk * (1 - config.riskTolerance));

  // Apply innovation preference
  const noveltyBonus = decision.novelty * config.innovation * 0.3;

  return Math.max(0, Math.min(1, riskAdjustedValue + noveltyBonus));
}

/**
 * Get competitive awareness modifier
 * Adjusts decisions based on player/other NPC actions
 */
export function getCompetitiveModifier(
  aiState: PersonalityAIState,
  competitorActions: Array<{ type: string; success: boolean }>,
): number {
  const config = PERSONALITY_CONFIG[aiState.personality];
  let modifier = 1;

  // Analyze competitor actions
  const successfulCompetitors = competitorActions.filter((a) => a.success).length;
  const totalCompetitors = competitorActions.length;

  if (totalCompetitors > 0) {
    const competitorSuccessRate = successfulCompetitors / totalCompetitors;

    // If competitors are succeeding, conservative personalities may avoid
    // Innovative personalities may try to compete
    if (competitorSuccessRate > 0.7) {
      modifier *= 1 - config.conservatism * 0.3 + config.innovation * 0.2;
    }

    // If competitors are failing, may be opportunity
    if (competitorSuccessRate < 0.3) {
      modifier *= 1 + config.innovation * 0.2;
    }
  }

  return modifier;
}
