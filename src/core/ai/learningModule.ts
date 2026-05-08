/**
 * Shared Learning Infrastructure
 * Tracks outcomes, patterns, and success rates for AI decision-making
 */

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
 * Create a new learning state
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
 * Record an outcome for learning
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
 * Update pattern recognition
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
 * Get success rate for a decision type and context
 */
export function getSuccessRate(
  state: LearningState,
  decisionType: string,
  contextKey: string,
): number {
  const key = `${decisionType}:${contextKey}`;
  const data = state.successRates[key];
  return data?.rate ?? 0.5; // Default to 50% if no data
}

/**
 * Get pattern score for a decision type
 */
export function getPatternScore(
  state: LearningState,
  decisionType: string,
  context: string,
): number {
  const patternKey = `${decisionType}:${context}`;
  return state.patterns[patternKey] ?? 0.5;
}

/**
 * Get adaptive threshold based on learning
 * Adjusts decision thresholds based on past success rates
 */
export function getAdaptiveThreshold(
  state: LearningState,
  decisionType: string,
  contextKey: string,
  baseThreshold: number,
  adaptationSpeed: number,
): number {
  const successRate = getSuccessRate(state, decisionType, contextKey);
  const adjustment = (successRate - 0.5) * adaptationSpeed * baseThreshold;
  return Math.max(0, baseThreshold - adjustment);
}

/**
 * Prune old outcomes outside time window
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
 * Get learning insights for a decision type
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
    if (key.startsWith(decisionType)) {
      patterns.push({ key: key.split(":")[1], score: state.patterns[key] });
    }
  }

  return {
    totalDecisions,
    successRate,
    avgValue,
    patterns,
  };
}
