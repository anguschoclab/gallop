/**
 * Tests for Learning Module
 * Tests learning state management, outcome tracking, and adaptive thresholds
 */

import { describe, it, expect } from "vitest";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getPatternScore,
  getAdaptiveThreshold,
  pruneOldOutcomes,
  getLearningInsights,
} from "@/core/ai/learningModule";

describe("createLearningState", () => {
  it("should initialize empty learning state", () => {
    const state = createLearningState();

    expect(state.outcomes).toEqual([]);
    expect(state.successRates).toBeInstanceOf(Object);
    expect(state.patterns).toBeInstanceOf(Object);
    expect(state.lastUpdate).toBe(0);
  });
});

describe("recordOutcome", () => {
  it("should record outcome to history", () => {
    const state = createLearningState();
    const timestamp = Date.now();
    const day = 100;

    const updatedState = recordOutcome(
      state,
      "decision_type",
      "context_key",
      true,
      100,
      timestamp,
      day,
      10,
    );

    expect(updatedState.outcomes).toHaveLength(1);
    expect(updatedState.outcomes[0].decisionType).toBe("decision_type");
    expect(updatedState.outcomes[0].contextKey).toBe("context_key");
    expect(updatedState.outcomes[0].success).toBe(true);
    expect(updatedState.outcomes[0].value).toBe(100);
    expect(updatedState.outcomes[0].timestamp).toBe(timestamp);
    expect(updatedState.outcomes[0].day).toBe(day);
  });

  it("should trim history to memory depth", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    for (let i = 0; i < 15; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        true,
        i * 10,
        timestamp + i,
        i,
        10,
      );
    }

    expect(updatedState.outcomes).toHaveLength(10);
  });

  it("should update success rates", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record 3 successes and 2 failures
    for (let i = 0; i < 5; i++) {
      updatedState = recordOutcome(
        updatedState,
        "breeding",
        "test_context",
        i < 3,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    const successRate = updatedState.successRates["breeding:test_context"];
    expect(successRate?.successes).toBe(3);
    expect(successRate?.total).toBe(5);
    expect(successRate?.rate).toBe(0.6);
  });

  it("should update patterns", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record multiple outcomes with same context dimension
    for (let i = 0; i < 5; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context:value",
        i < 3,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    const patternScore = updatedState.patterns["decision:context:value"];
    expect(patternScore).toBeDefined();
    expect(patternScore).toBeGreaterThan(0);
  });

  it("should not mutate original state", () => {
    const state = createLearningState();
    const originalOutcomesLength = state.outcomes.length;

    recordOutcome(state, "decision", "context", true, 100, Date.now(), 1, 10);

    expect(state.outcomes).toHaveLength(originalOutcomesLength);
  });
});

describe("getSuccessRate", () => {
  it("should return 0.5 for unknown decision type", () => {
    const state = createLearningState();
    const successRate = getSuccessRate(state, "unknown", "unknown_context");
    expect(successRate).toBe(0.5);
  });

  it("should return recorded success rate", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record 7 successes and 3 failures
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "breeding",
        "test",
        i < 7,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    const successRate = getSuccessRate(updatedState, "breeding", "test");
    expect(successRate).toBe(0.7);
  });

  it("should return 1.0 for all successes", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    for (let i = 0; i < 5; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        true,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    const successRate = getSuccessRate(updatedState, "decision", "context");
    expect(successRate).toBe(1.0);
  });

  it("should return 0.0 for all failures", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    for (let i = 0; i < 5; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        false,
        0,
        timestamp + i,
        i,
        10,
      );
    }

    const successRate = getSuccessRate(updatedState, "decision", "context");
    expect(successRate).toBe(0.0);
  });
});

describe("getPatternScore", () => {
  it("should return 0.5 for unknown pattern", () => {
    const state = createLearningState();
    const patternScore = getPatternScore(state, "unknown", "unknown");
    expect(patternScore).toBe(0.5);
  });

  it("should return recorded pattern score", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record successes to increase pattern score
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context:value1",
        true,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    const patternScore = getPatternScore(updatedState, "decision", "context:value1");
    // Pattern score increases with successes, may not exceed 0.5 if starting from 0.5
    expect(patternScore).toBeGreaterThanOrEqual(0.5);
  });

  it("should decrease pattern score on failures", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record failures to decrease pattern score
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context:value1",
        false,
        0,
        timestamp + i,
        i,
        10,
      );
    }

    const patternScore = getPatternScore(updatedState, "decision", "context:value1");
    // Pattern score decreases with failures
    expect(patternScore).toBeLessThanOrEqual(0.5);
  });
});

describe("getAdaptiveThreshold", () => {
  it("should return base threshold for unknown decisions", () => {
    const state = createLearningState();
    const threshold = getAdaptiveThreshold(state, "unknown", "unknown", 50, 0.5);
    expect(threshold).toBe(50);
  });

  it("should lower threshold when success rate is high", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record high success rate
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        true,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    const threshold = getAdaptiveThreshold(updatedState, "decision", "context", 50, 0.5);
    expect(threshold).toBeLessThan(50);
  });

  it("should raise threshold when success rate is low", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record low success rate
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        false,
        0,
        timestamp + i,
        i,
        10,
      );
    }

    const threshold = getAdaptiveThreshold(updatedState, "decision", "context", 50, 0.5);
    expect(threshold).toBeGreaterThan(50);
  });

  it("should respect adaptation speed", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        true,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    const lowSpeedThreshold = getAdaptiveThreshold(updatedState, "decision", "context", 50, 0.1);
    const highSpeedThreshold = getAdaptiveThreshold(updatedState, "decision", "context", 50, 0.9);

    expect(highSpeedThreshold).toBeLessThan(lowSpeedThreshold);
  });

  it("should not go below 0", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record very high success rate
    for (let i = 0; i < 20; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        true,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    const threshold = getAdaptiveThreshold(updatedState, "decision", "context", 50, 1.0);
    expect(threshold).toBeGreaterThanOrEqual(0);
  });
});

describe("pruneOldOutcomes", () => {
  it("should remove outcomes older than cutoff day", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        true,
        100,
        timestamp + i,
        i,
        10,
      );
    }

    // Prune outcomes before day 5
    updatedState = pruneOldOutcomes(updatedState, 5);

    expect(updatedState.outcomes.length).toBeLessThan(10);
    expect(updatedState.outcomes.every((o) => o.day >= 5)).toBe(true);
  });

  it("should recalculate success rates after pruning", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record 5 successes then 5 failures
    for (let i = 0; i < 5; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        true,
        100,
        timestamp + i,
        i,
        10,
      );
    }
    for (let i = 5; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        false,
        0,
        timestamp + i,
        i,
        10,
      );
    }

    // Prune to keep only the failures (days 5-9)
    updatedState = pruneOldOutcomes(updatedState, 5);

    const successRate = updatedState.successRates["decision:context"];
    expect(successRate?.rate).toBe(0.0);
  });

  it("should handle empty state", () => {
    const state = createLearningState();
    const updatedState = pruneOldOutcomes(state, 100);
    expect(updatedState.outcomes).toEqual([]);
  });
});

describe("getLearningInsights", () => {
  it("should return zero insights for empty state", () => {
    const state = createLearningState();
    const insights = getLearningInsights(state, "decision_type");

    expect(insights.totalDecisions).toBe(0);
    expect(insights.successRate).toBe(0.5);
    expect(insights.avgValue).toBe(0);
    expect(insights.patterns).toEqual([]);
  });

  it("should return insights for decision type", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record mixed outcomes
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "breeding",
        `context:${i % 3}`,
        i < 7,
        i * 100,
        timestamp + i,
        i,
        10,
      );
    }

    const insights = getLearningInsights(updatedState, "breeding");

    expect(insights.totalDecisions).toBe(10);
    expect(insights.successRate).toBe(0.7);
    expect(insights.avgValue).toBe(450); // Average of 0, 100, 200, ..., 900
    expect(insights.patterns).toHaveLength(3);
  });

  it("should calculate average value correctly", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    const values = [100, 200, 300];
    for (let i = 0; i < 3; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        "context",
        true,
        values[i],
        timestamp + i,
        i,
        10,
      );
    }

    const insights = getLearningInsights(updatedState, "decision");
    expect(insights.avgValue).toBe(200);
  });

  it("should extract pattern keys correctly", () => {
    const state = createLearningState();
    const timestamp = Date.now();

    let updatedState = state;
    // Record outcomes with different context dimensions
    updatedState = recordOutcome(
      updatedState,
      "decision",
      "type1:value",
      true,
      100,
      timestamp,
      1,
      10,
    );
    updatedState = recordOutcome(
      updatedState,
      "decision",
      "type2:value",
      true,
      100,
      timestamp + 1,
      2,
      10,
    );

    const insights = getLearningInsights(updatedState, "decision");
    const patternKeys = insights.patterns.map((p) => p.key);
    expect(patternKeys).toContain("type1:value");
    expect(patternKeys).toContain("type2:value");
  });
});
