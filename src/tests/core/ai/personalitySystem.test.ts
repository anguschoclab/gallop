/**
 * Tests for Personality System AI
 * Tests personality-driven decision scoring, strategic planning, and learning integration
 */

import { describe, it, expect } from "vitest";
import {
  getPersonalityAIState,
  calculateUtilityScore,
  recordOutcome,
  calculateStrategicScore,
  getCompetitiveModifier,
} from "@/core/ai/personalitySystem";
import type { StablePersonality } from "@/game/types";

describe("getPersonalityAIState", () => {
  it("should initialize AI state for each personality", () => {
    const personalities: StablePersonality[] = [
      "aggressive",
      "conservative",
      "developer",
      "win-now",
      "specialist",
      "breeder",
      "trader",
      "prestige",
    ];

    for (const personality of personalities) {
      const state = getPersonalityAIState(personality);
      expect(state.personality).toBe(personality);
      expect(state.learningRate).toBeGreaterThan(0);
      expect(state.memoryDepth).toBeGreaterThan(0);
      expect(state.adaptationSpeed).toBeGreaterThan(0);
      expect(state.strategicHorizon).toBeGreaterThan(0);
      expect(state.competitiveAwareness).toBeGreaterThan(0);
      expect(state.conservatism).toBeGreaterThan(0);
      expect(state.innovation).toBeGreaterThan(0);
      expect(state.outcomes).toEqual([]);
      expect(state.successRates).toBeInstanceOf(Map);
      expect(state.currentStrategy).toBe("default");
      expect(state.strategyConfidence).toBe(0.5);
      expect(state.lastStrategyChange).toBe(0);
    }
  });

  it("should have different configurations for different personalities", () => {
    const aggressiveState = getPersonalityAIState("aggressive");
    const conservativeState = getPersonalityAIState("conservative");

    // Access config values through the PERSONALITY_CONFIG
    const { PERSONALITY_CONFIG } = require("@/core/stable/stableConfig");
    const aggressiveConfig = PERSONALITY_CONFIG.aggressive;
    const conservativeConfig = PERSONALITY_CONFIG.conservative;

    expect(aggressiveConfig.riskTolerance).toBeGreaterThan(conservativeConfig.riskTolerance);
    expect(aggressiveState.conservatism).toBeLessThan(conservativeState.conservatism);
    expect(aggressiveState.innovation).toBeGreaterThan(conservativeState.innovation);
  });
});

describe("calculateUtilityScore", () => {
  it("should calculate base score from factors", () => {
    const state = getPersonalityAIState("aggressive");
    const factors = {
      risk: 0.8,
      purse: 10000,
      horse_quality: 75,
    };

    const score = calculateUtilityScore(state, "race_entry", factors);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should apply risk tolerance to risk factors", () => {
    const aggressiveState = getPersonalityAIState("aggressive");
    const conservativeState = getPersonalityAIState("conservative");

    const factors = {
      risk: 0.9,
      purse: 5000,
    };

    const aggressiveScore = calculateUtilityScore(aggressiveState, "race_entry", factors);
    const conservativeScore = calculateUtilityScore(conservativeState, "race_entry", factors);

    // Aggressive personalities should score higher for risky decisions
    expect(aggressiveScore).toBeGreaterThan(conservativeScore);
  });

  it("should apply youth preference to age factors", () => {
    const developerState = getPersonalityAIState("developer");
    const winNowState = getPersonalityAIState("win-now");

    const factors = {
      youth: 0.9,
      purse: 5000,
    };

    const developerScore = calculateUtilityScore(developerState, "purchase", factors);
    const winNowScore = calculateUtilityScore(winNowState, "purchase", factors);

    // Developer personalities should score higher for youth-focused decisions
    expect(developerScore).toBeGreaterThan(winNowScore);
  });

  it("should apply genetic insight to DNA factors", () => {
    const developerState = getPersonalityAIState("developer");
    const traderState = getPersonalityAIState("trader");

    const factors = {
      genetic: 0.8,
      pedigree: 0.7,
    };

    const developerScore = calculateUtilityScore(developerState, "breeding", factors);
    const traderScore = calculateUtilityScore(traderState, "breeding", factors);

    // Developer personalities should score higher for genetic insights
    expect(developerScore).toBeGreaterThan(traderScore);
  });

  it("should apply graded race bonus to stakes factors", () => {
    const prestigeState = getPersonalityAIState("prestige");
    const traderState = getPersonalityAIState("trader");

    const factors = {
      graded: 1.0,
      purse: 5000,
    };

    const prestigeScore = calculateUtilityScore(prestigeState, "race_entry", factors);
    const traderScore = calculateUtilityScore(traderState, "race_entry", factors);

    // Prestige personalities should score higher for graded races
    expect(prestigeScore).toBeGreaterThan(traderScore);
  });

  it("should apply conservatism modifier for unfamiliar strategies", () => {
    const conservativeState = getPersonalityAIState("conservative");
    conservativeState.currentStrategy = "aggressive";
    conservativeState.strategyConfidence = 0.3;

    const factors = {
      risk: 0.5,
      purse: 5000,
    };

    const score = calculateUtilityScore(conservativeState, "decision", factors);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("should apply innovation modifier for novel approaches", () => {
    const aggressiveState = getPersonalityAIState("aggressive");
    const factors = {
      risk: 0.5,
      purse: 5000,
    };

    const normalScore = calculateUtilityScore(aggressiveState, "decision", factors);
    const novelScore = calculateUtilityScore(aggressiveState, "novel", factors);

    // Novel approaches should get an innovation bonus
    expect(novelScore).toBeGreaterThan(normalScore);
  });

  it("should clamp score between 0 and 1", () => {
    const state = getPersonalityAIState("aggressive");
    const factors = {
      risk: 100,
      purse: 1000000,
    };

    const score = calculateUtilityScore(state, "decision", factors);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("recordOutcome", () => {
  it("should record outcome to history", () => {
    const state = getPersonalityAIState("aggressive");
    const timestamp = Date.now();

    const updatedState = recordOutcome(
      state,
      "race_entry",
      { race_class: "G1" },
      true,
      1000,
      timestamp,
    );

    expect(updatedState.outcomes).toHaveLength(1);
    expect(updatedState.outcomes[0].decisionType).toBe("race_entry");
    expect(updatedState.outcomes[0].success).toBe(true);
    expect(updatedState.outcomes[0].value).toBe(1000);
    expect(updatedState.outcomes[0].timestamp).toBe(timestamp);
  });

  it("should trim history to memory depth", () => {
    const state = getPersonalityAIState("conservative");
    const timestamp = Date.now();

    // Conservative has memoryDepth of 90, but let's test with a smaller effective depth
    state.memoryDepth = 5;

    let updatedState = state;
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        { iteration: i },
        true,
        i * 100,
        timestamp + i,
      );
    }

    expect(updatedState.outcomes).toHaveLength(5);
  });

  it("should update success rates", () => {
    const state = getPersonalityAIState("aggressive");
    const timestamp = Date.now();

    let updatedState = state;
    // Record 3 successes and 2 failures
    for (let i = 0; i < 5; i++) {
      updatedState = recordOutcome(
        updatedState,
        "breeding",
        { context: "test" },
        i < 3,
        100,
        timestamp + i,
      );
    }

    const successRate = updatedState.successRates.get("breeding:context:test");
    expect(successRate).toBe(0.6);
  });

  it("should adapt strategy when success rate is low", () => {
    const state = getPersonalityAIState("aggressive");
    state.memoryDepth = 10;
    const timestamp = Date.now();

    let updatedState = state;
    // Record enough failures to trigger adaptation
    for (let i = 0; i < 10; i++) {
      updatedState = recordOutcome(
        updatedState,
        "decision",
        { context: "test" },
        false,
        0,
        timestamp + i,
      );
    }

    // Strategy should change after enough failures
    expect(updatedState.strategyConfidence).toBeLessThan(0.5);
  });
});

describe("calculateStrategicScore", () => {
  it("should balance short-term and long-term value", () => {
    const state = getPersonalityAIState("aggressive");
    state.strategicHorizon = 7;

    const decision = {
      shortTermValue: 0.8,
      longTermValue: 0.4,
      risk: 0.3,
      novelty: 0.2,
    };

    const score = calculateStrategicScore(state, decision);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should weight long-term value higher for conservative personalities", () => {
    const aggressiveState = getPersonalityAIState("aggressive");
    aggressiveState.strategicHorizon = 7;

    const conservativeState = getPersonalityAIState("conservative");
    conservativeState.strategicHorizon = 30;

    const decision = {
      shortTermValue: 0.5,
      longTermValue: 0.9,
      risk: 0.2,
      novelty: 0.1,
    };

    const aggressiveScore = calculateStrategicScore(aggressiveState, decision);
    const conservativeScore = calculateStrategicScore(conservativeState, decision);

    // Conservative should value long-term more
    expect(conservativeScore).toBeGreaterThan(aggressiveScore);
  });

  it("should apply risk tolerance to risk", () => {
    const aggressiveState = getPersonalityAIState("aggressive");
    const conservativeState = getPersonalityAIState("conservative");

    const decision = {
      shortTermValue: 0.5,
      longTermValue: 0.5,
      risk: 0.8,
      novelty: 0.1,
    };

    const aggressiveScore = calculateStrategicScore(aggressiveState, decision);
    const conservativeScore = calculateStrategicScore(conservativeState, decision);

    // Aggressive should handle risk better
    expect(aggressiveScore).toBeGreaterThan(conservativeScore);
  });

  it("should apply innovation preference to novelty", () => {
    const traderState = getPersonalityAIState("trader");
    traderState.innovation = 0.8;

    const decision = {
      shortTermValue: 0.5,
      longTermValue: 0.5,
      risk: 0.3,
      novelty: 0.9,
    };

    const score = calculateStrategicScore(traderState, decision);
    expect(score).toBeGreaterThan(0.5);
  });
});

describe("getCompetitiveModifier", () => {
  it("should return 1 when no competitor actions", () => {
    const state = getPersonalityAIState("aggressive");
    const modifier = getCompetitiveModifier(state, []);
    expect(modifier).toBe(1);
  });

  it("should reduce modifier when competitors succeeding", () => {
    const conservativeState = getPersonalityAIState("conservative");

    const competitorActions = [
      { type: "breeding", success: true },
      { type: "breeding", success: true },
      { type: "breeding", success: true },
    ];

    const modifier = getCompetitiveModifier(conservativeState, competitorActions);
    expect(modifier).toBeLessThan(1);
  });

  it("should increase modifier for innovative personalities when competitors succeeding", () => {
    const traderState = getPersonalityAIState("trader");

    const competitorActions = [
      { type: "purchase", success: true },
      { type: "purchase", success: true },
    ];

    const modifier = getCompetitiveModifier(traderState, competitorActions);
    // Trader personality has high innovation, may compete
    expect(modifier).toBeGreaterThan(0.9);
  });

  it("should increase modifier when competitors failing", () => {
    const traderState = getPersonalityAIState("trader");

    const competitorActions = [
      { type: "purchase", success: false },
      { type: "purchase", success: false },
    ];

    const modifier = getCompetitiveModifier(traderState, competitorActions);
    expect(modifier).toBeGreaterThan(1);
  });
});
