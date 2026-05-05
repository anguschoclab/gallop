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
  successRates: Map<string, { successes: number; total: number; rate: number }>;
  patterns: Map<string, number>; // Pattern recognition scores
  lastUpdate: number;
}

/**
 * Create a new learning state
 */
export function createLearningState(): LearningState {
  return {
    outcomes: [],
    successRates: new Map(),
    patterns: new Map(),
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

  // Add to memory
  state.outcomes.push(outcome);

  // Trim to memory depth
  if (state.outcomes.length > memoryDepth) {
    state.outcomes = state.outcomes.slice(-memoryDepth);
  }

  // Update success rates
  const key = `${decisionType}:${contextKey}`;
  const existing = state.successRates.get(key) || { successes: 0, total: 0, rate: 0 };
  const updated = {
    successes: existing.successes + (success ? 1 : 0),
    total: existing.total + 1,
    rate: (existing.successes + (success ? 1 : 0)) / (existing.total + 1),
  };
  state.successRates.set(key, updated);

  // Update patterns
  updatePatterns(state, decisionType, contextKey, success);

  state.lastUpdate = timestamp;

  return state;
}

/**
 * Update pattern recognition
 */
function updatePatterns(
  state: LearningState,
  decisionType: string,
  contextKey: string,
  success: boolean,
): void {
  const patternKey = `${decisionType}:${contextKey.split(":")[0]}`; // Use first context dimension
  const existing = state.patterns.get(patternKey) || 0.5;
  const weight = success ? 0.1 : -0.05;
  state.patterns.set(patternKey, Math.max(0, Math.min(1, existing + weight)));
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
  const data = state.successRates.get(key);
  return data?.rate ?? 0.5; // Default to 50% if no data
}

/**
 * Get pattern score for a decision type
 */
export function getPatternScore(state: LearningState, decisionType: string, context: string): number {
  const patternKey = `${decisionType}:${context.split(":")[0]}`;
  return state.patterns.get(patternKey) ?? 0.5;
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
  state.outcomes = state.outcomes.filter((o) => o.day >= cutoffDay);
  
  // Recalculate success rates after pruning
  const newSuccessRates = new Map();
  const grouped = new Map<string, { successes: number; total: number }>();
  
  for (const outcome of state.outcomes) {
    const key = `${outcome.decisionType}:${outcome.contextKey}`;
    const existing = grouped.get(key) || { successes: 0, total: 0 };
    grouped.set(key, {
      successes: existing.successes + (outcome.success ? 1 : 0),
      total: existing.total + 1,
    });
  }
  
  for (const [key, data] of grouped.entries()) {
    newSuccessRates.set(key, {
      successes: data.successes,
      total: data.total,
      rate: data.successes / data.total,
    });
  }
  
  state.successRates = newSuccessRates;
  
  return state;
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
    totalDecisions > 0
      ? relevantOutcomes.reduce((sum, o) => sum + o.value, 0) / totalDecisions
      : 0;

  const patterns: Array<{ key: string; score: number }> = [];
  for (const [key, score] of state.patterns.entries()) {
    if (key.startsWith(decisionType)) {
      patterns.push({ key: key.split(":")[1], score });
    }
  }

  return {
    totalDecisions,
    successRate,
    avgValue,
    patterns,
  };
}
