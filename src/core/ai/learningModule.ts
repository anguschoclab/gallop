/**
 * learningModule.ts - Shared learning infrastructure
 *
 * This file provides shared learning infrastructure that tracks outcomes,
 * patterns, and success rates for AI decision-making across all AI subsystems.
 *
 * Dependencies: None
 * Related files: personalitySystem.ts (uses learning state), npcCycleAI.ts (uses learning functions)
 */

/**
 * Shared Learning Infrastructure
 * Tracks outcomes, patterns, and success rates for AI decision-making
 */

// Cache configuration
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL_MS = 60000; // 1 minute

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class LearningCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = CACHE_MAX_SIZE, ttl: number = CACHE_TTL_MS) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global cache instances
const successRateCache = new LearningCache<number>();
const patternScoreCache = new LearningCache<number>();
const adaptiveThresholdCache = new LearningCache<number>();

export interface LearningOutcome {
  decisionType: string;
  contextKey: string;
  success: boolean;
  value: number;
  timestamp: number;
  day: number;
}

export interface LearningState {
  outcomes: LearningOutcome[];
  successRates: Record<string, { successes: number; total: number; rate: number }>;
  patterns: Record<string, number>; // Pattern recognition scores
  lastUpdate: number;
}

/**
 * Create a new learning state.
 *
 * Initializes the learning state with empty outcomes, success rates,
 * patterns, and last update timestamp.
 *
 * @returns New learning state
 */
export function createLearningState(): LearningState {
  return {
    outcomes: [],
    successRates: {},
    patterns: {},
    lastUpdate: 0,
  };
}

/**
 * Record an outcome for learning.
 *
 * Records the outcome, trims to memory depth, updates success rates,
 * and updates pattern recognition.
 *
 * @param state - Current learning state
 * @param decisionType - Type of decision made
 * @param contextKey - Context key for the decision
 * @param success - Whether the decision was successful
 * @param value - Value of the outcome
 * @param timestamp - Timestamp of the outcome
 * @param day - Current game day
 * @param memoryDepth - Maximum number of outcomes to keep
 * @returns Updated learning state
 */
export function recordOutcome(
  state: LearningState,
  decisionType: string,
  contextKey: string,
  success: boolean,
  value: number,
  timestamp: number,
  day: number,
  memoryDepth: number,
): LearningState {
  const outcome: LearningOutcome = {
    decisionType,
    contextKey,
    success,
    value,
    timestamp,
    day,
  };

  // Clone array to avoid mutating frozen/read-only objects
  const newOutcomes = [...state.outcomes, outcome];

  // Trim to memory depth
  const trimmedOutcomes =
    newOutcomes.length > memoryDepth ? newOutcomes.slice(-memoryDepth) : newOutcomes;

  // Update success rates
  const key = `${decisionType}:${contextKey}`;
  const existing = state.successRates[key] || { successes: 0, total: 0, rate: 0 };
  const updated = {
    successes: existing.successes + (success ? 1 : 0),
    total: existing.total + 1,
    rate: (existing.successes + (success ? 1 : 0)) / (existing.total + 1),
  };
  const newSuccessRates = { ...state.successRates, [key]: updated };

  // Update patterns
  const newPatterns = updatePatterns(state.patterns, decisionType, contextKey, success);

  // Return new state to avoid mutating frozen/read-only objects
  return {
    outcomes: trimmedOutcomes,
    successRates: newSuccessRates,
    patterns: newPatterns,
    lastUpdate: timestamp,
  };
}

/**
 * Update pattern recognition.
 *
 * Updates pattern recognition scores based on outcomes. Increases score
 * for successful decisions, decreases slightly for failures.
 *
 * @param patterns - Current pattern scores
 * @param decisionType - Type of decision made
 * @param contextKey - Context key for the decision
 * @param success - Whether the decision was successful
 * @returns Updated pattern scores
 */
function updatePatterns(
  patterns: Record<string, number>,
  decisionType: string,
  contextKey: string,
  success: boolean,
): Record<string, number> {
  const patternKey = `${decisionType}:${contextKey}`; // Use full context key
  const existing = patterns[patternKey] ?? 0.5;
  const weight = success ? 0.1 : -0.05;
  return {
    ...patterns,
    [patternKey]: Math.max(0, Math.min(1, existing + weight)),
  };
}

/**
 * Get success rate for a decision type and context.
 *
 * Returns the success rate for a specific decision type and context key.
 * Defaults to 0.5 if no data available. Uses cache for performance.
 *
 * @param state - Current learning state
 * @param decisionType - Type of decision
 * @param contextKey - Context key for the decision
 * @returns Success rate (0-1)
 */
export function getSuccessRate(
  state: LearningState,
  decisionType: string,
  contextKey: string,
): number {
  const cacheKey = `${state.lastUpdate}:${decisionType}:${contextKey}`;
  const cached = successRateCache.get(cacheKey);
  if (cached !== null) return cached;

  const key = `${decisionType}:${contextKey}`;
  const data = state.successRates[key];
  const result = data?.rate ?? 0.5; // Default to 50% if no data

  successRateCache.set(cacheKey, result);
  return result;
}

/**
 * Get pattern score for a decision type.
 *
 * Returns the pattern recognition score for a specific decision type and context.
 * Defaults to 0.5 if no pattern data available. Uses cache for performance.
 *
 * @param state - Current learning state
 * @param decisionType - Type of decision
 * @param context - Context string
 * @returns Pattern score (0-1)
 */
export function getPatternScore(
  state: LearningState,
  decisionType: string,
  context: string,
): number {
  const cacheKey = `${state.lastUpdate}:${decisionType}:${context}`;
  const cached = patternScoreCache.get(cacheKey);
  if (cached !== null) return cached;

  const patternKey = `${decisionType}:${context}`;
  const result = state.patterns[patternKey] ?? 0.5;

  patternScoreCache.set(cacheKey, result);
  return result;
}

/**
 * Get adaptive threshold based on learning.
 *
 * Adjusts decision thresholds based on past success rates and adaptation speed.
 * Uses cache for performance.
 *
 * @param state - Current learning state
 * @param decisionType - Type of decision
 * @param contextKey - Context key for the decision
 * @param baseThreshold - Base threshold value
 * @param adaptationSpeed - Speed of adaptation (0-1)
 * @returns Adaptive threshold value
 */
export function getAdaptiveThreshold(
  state: LearningState,
  decisionType: string,
  contextKey: string,
  baseThreshold: number,
  adaptationSpeed: number,
): number {
  const cacheKey = `${state.lastUpdate}:${decisionType}:${contextKey}:${baseThreshold}:${adaptationSpeed}`;
  const cached = adaptiveThresholdCache.get(cacheKey);
  if (cached !== null) return cached;

  const successRate = getSuccessRate(state, decisionType, contextKey);
  const adjustment = (successRate - 0.5) * adaptationSpeed * baseThreshold;
  const result = Math.max(0, baseThreshold - adjustment);

  adaptiveThresholdCache.set(cacheKey, result);
  return result;
}

/**
 * Prune old outcomes outside time window.
 *
 * Removes outcomes older than the cutoff day and recalculates
 * success rates based on remaining outcomes.
 *
 * @param state - Current learning state
 * @param cutoffDay - Day cutoff for pruning outcomes
 * @returns Updated learning state
 */
export function pruneOldOutcomes(state: LearningState, cutoffDay: number): LearningState {
  const outcomes = state.outcomes.filter((o) => o.day >= cutoffDay);
  if (outcomes.length === state.outcomes.length) return state;

  // Recalculate success rates after pruning
  const newSuccessRates: Record<string, { successes: number; total: number; rate: number }> = {};
  const grouped: Record<string, { successes: number; total: number }> = {};

  for (const outcome of outcomes) {
    const key = `${outcome.decisionType}:${outcome.contextKey}`;
    const existing = grouped[key] || { successes: 0, total: 0 };
    grouped[key] = {
      successes: existing.successes + (outcome.success ? 1 : 0),
      total: existing.total + 1,
    };
  }

  for (const key in grouped) {
    const data = grouped[key];
    newSuccessRates[key] = {
      successes: data.successes,
      total: data.total,
      rate: data.successes / data.total,
    };
  }

  return {
    ...state,
    outcomes,
    successRates: newSuccessRates,
  };
}

/**
 * Get learning insights for a decision type.
 *
 * Returns statistics including total decisions, success rate, average value,
 * and pattern scores for a specific decision type.
 *
 * @param state - Current learning state
 * @param decisionType - Type of decision to get insights for
 * @returns Object with learning insights
 */
export function getLearningInsights(
  state: LearningState,
  decisionType: string,
): {
  totalDecisions: number;
  successRate: number;
  avgValue: number;
  patterns: Array<{ key: string; score: number }>;
} {
  const relevantOutcomes = state.outcomes.filter((o) => o.decisionType === decisionType);
  const totalDecisions = relevantOutcomes.length;
  const successes = relevantOutcomes.filter((o) => o.success).length;
  const successRate = totalDecisions > 0 ? successes / totalDecisions : 0.5;
  const avgValue =
    totalDecisions > 0 ? relevantOutcomes.reduce((sum, o) => sum + o.value, 0) / totalDecisions : 0;

  const patterns: Array<{ key: string; score: number }> = [];
  for (const key in state.patterns) {
    if (key.startsWith(decisionType + ":")) {
      patterns.push({ key: key.substring(decisionType.length + 1), score: state.patterns[key] });
    }
  }

  return {
    totalDecisions,
    successRate,
    avgValue,
    patterns,
  };
}
