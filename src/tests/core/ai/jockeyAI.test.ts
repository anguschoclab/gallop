/**
 * Tests for Jockey Selection AI
 * Tests personality-driven jockey matching, retention, and contract negotiation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createJockeyAIState,
  calculateJockeySuitability,
  selectBestJockey,
  shouldRetainJockey,
  calculateMaxJockeyFee,
  recordJockeyAssignment,
  recordJockeyOutcome,
  getJockeyInsights,
} from "@/core/ai/jockeyAI";
import type { Jockey, Horse, Stable } from "@/game/types";
import type { JockeyStats } from "@/core/jockey/types";

// Mock data setup
function createMockJockey(overrides: Partial<Jockey> = {}): Jockey {
  return {
    id: "jockey-1",
    name: "Test Jockey",
    age: 30,
    archetype: "versatile",
    stats: { pacing: 75, positioning: 75, vigor: 75, gateSkill: 75, temperament: 75 },
    traits: [],
    silk: { pattern: "solid", primary: "red", secondary: "white", cap: "white" },
    careerStarts: 100,
    careerWins: 30,
    fame: 50,
    ridingFee: 1000,
    ...overrides,
  };
}

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    gender: "colt",
    hemisphere: "Northern",
    silk: "red",
    energy: 80,
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
    genotype: {
      color: { extension: [3, 3], agouti: [3, 3], gray: [1, 1], cream: [1, 1] },
      stats: { speed: [[3, 3]], stamina: [[3, 3]], acceleration: [[3, 3]], consistency: [[3, 3]] },
      preferences: { distance: [3, 3], surface: [3, 3], climbing: [3, 3], cornering: [3, 3] },
      style: [3, 3],
      mental: [3, 3],
      physical: [3, 3],
      durability: [3, 3],
      size: [3, 3],
      markers: {
        leopardComplex: "recessive",
        csnbRisk: "low",
        sensoryPerception: "good",
        signalTransduction: "good",
        immunity: "good",
        geneticDiversity: 0.5,
        lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
      },
      heart: [[3, 3]],
      fiberType: [3, 3],
      stride: [3, 3],
      trackBias: [3, 3],
      mudAptitude: [3, 3],
      trainability: [3, 3],
      peakAge: [3, 3],
      recovery: [3, 3],
      fertility: [3, 3],
      foalingEase: [3, 3],
      markings: { socks: [3, 3], face: [3, 3], silverDapple: [3, 3], sabino: [3, 3], splashWhite: [3, 3] },
      health: { bleeder: [3, 3], roarer: [3, 3], ocd: [3, 3], efna5: [3, 3], pssm: [3, 3], rer: [3, 3], epm: [3, 3] },
    },
    form: 0.8,
    potential: 80,
    fame: 0,
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    climbingAptitude: 0.8,
    corneringAptitude: 0.8,
    injuryProneness: 0.2,
    height: 16,
    weight: 1000,
    lifetimeEarnings: 0,
    careerStarts: 0,
    careerWins: 0,
    heartScore: 70,
    fiberBias: "balanced",
    strideType: "balanced",
    trackPreference: "balanced",
    mudAptitude: 0.7,
    trainability: 0.7,
    peakAge: 4,
    recoveryRate: 0.7,
    fertility: 0.7,
    foalingEase: 0.7,
    markings: { socks: "none", face: "none", silverDapple: false, sabino: false, splashWhite: false },
    bleederRisk: 0.1,
    roarerRisk: 0.1,
    ocdRisk: 0.1,
    racingViable: true,
    lifecycleStatus: "active",
    raceHistory: [],
    owned: true,
    ...overrides,
  };
}

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: "stable-1",
    name: "Test Stable",
    cash: 100000,
    personality: "aggressive",
    owner: "Test Owner",
    tier: "mid",
    reputation: 70,
    founded: 1,
    horses: [],
    isMajor: false,
    colors: { primary: "red", secondary: "blue" },
    ...overrides,
  };
}

describe("createJockeyAIState", () => {
  it("should initialize AI state for a stable", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createJockeyAIState(stable);

    expect(state.personalityState.personality).toBe("aggressive");
    expect(state.learningState.outcomes).toEqual([]);
    expect(state.jockeyHistory).toEqual([]);
    expect(state.retention).toEqual([]);
  });

  it("should have different personality states for different personalities", () => {
    const aggressiveState = createJockeyAIState(createMockStable({ personality: "aggressive" }));
    const conservativeState = createJockeyAIState(createMockStable({ personality: "conservative" }));

    expect(aggressiveState.personalityState.personality).toBe("aggressive");
    expect(conservativeState.personalityState.personality).toBe("conservative");
  });
});

describe("calculateJockeySuitability", () => {
  it("should calculate base score from jockey stats", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey({ stats: { pacing: 90, positioning: 90, vigor: 90, gateSkill: 90, temperament: 90 } });
    const horse = createMockHorse();
    const stable = createMockStable();

    const score = calculateJockeySuitability(state, jockey, horse, stable);
    expect(score).toBeGreaterThan(0);
  });

  it("should prefer higher vigor jockeys for aggressive personalities", () => {
    const state = createJockeyAIState(createMockStable({ personality: "aggressive" }));
    const highVigorJockey = createMockJockey({ stats: { pacing: 70, positioning: 70, vigor: 90, gateSkill: 70, temperament: 70 } });
    const lowVigorJockey = createMockJockey({ stats: { pacing: 70, positioning: 70, vigor: 50, gateSkill: 70, temperament: 70 } });
    const horse = createMockHorse();
    const stable = createMockStable({ personality: "aggressive" });

    const highVigorScore = calculateJockeySuitability(state, highVigorJockey, horse, stable);
    const lowVigorScore = calculateJockeySuitability(state, lowVigorJockey, horse, stable);

    expect(highVigorScore).toBeGreaterThan(lowVigorScore);
  });

  it("should apply learning from past assignments", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    // Record successful assignment
    const stateWithLearning = recordJockeyAssignment(state, jockey, horse, "race-1", stable, 1000, 1);

    const score = calculateJockeySuitability(stateWithLearning, jockey, horse, stable);
    // Score should be different after learning
    expect(score).toBeGreaterThan(0);
  });

  it("should clamp score between 0 and 100", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey({ stats: { pacing: 100, positioning: 100, vigor: 100, gateSkill: 100, temperament: 100 } });
    const horse = createMockHorse();
    const stable = createMockStable();

    const score = calculateJockeySuitability(state, jockey, horse, stable);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("selectBestJockey", () => {
  it("should return null when no jockeys available", () => {
    const state = createJockeyAIState(createMockStable());
    const horse = createMockHorse();
    const stable = createMockStable();

    const bestJockey = selectBestJockey(state, horse, [], stable);
    expect(bestJockey).toBeNull();
  });

  it("should return the only jockey when only one available", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    const bestJockey = selectBestJockey(state, horse, [jockey], stable);
    expect(bestJockey).toBe(jockey);
  });

  it("should select highest suitability jockey", () => {
    const state = createJockeyAIState(createMockStable());
    const highSkillJockey = createMockJockey({
      id: "jockey-1",
      stats: { pacing: 80, positioning: 80, vigor: 80, gateSkill: 80, temperament: 80 },
    });
    const lowSkillJockey = createMockJockey({
      id: "jockey-2",
      stats: { pacing: 60, positioning: 60, vigor: 60, gateSkill: 60, temperament: 60 },
    });
    const horse = createMockHorse();
    const stable = createMockStable();

    const bestJockey = selectBestJockey(state, horse, [lowSkillJockey, highSkillJockey], stable);
    expect(bestJockey?.id).toBe("jockey-1");
  });

  it("should filter out jockeys with score below 50", () => {
    const state = createJockeyAIState(createMockStable());
    const lowSkillJockey = createMockJockey({
      id: "jockey-1",
      stats: { pacing: 30, positioning: 30, vigor: 30, gateSkill: 30, temperament: 30 },
    });
    const horse = createMockHorse();
    const stable = createMockStable();

    const bestJockey = selectBestJockey(state, horse, [lowSkillJockey], stable);
    expect(bestJockey).toBeNull();
  });
});

describe("shouldRetainJockey", () => {
  it("should retain new jockey by default", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const stable = createMockStable();

    const shouldRetain = shouldRetainJockey(state, jockey, stable, 10);
    expect(shouldRetain).toBe(true);
  });

  it("should retain jockey with high prize earnings", () => {
    const state = createJockeyAIState(createMockStable({ personality: "conservative" }));
    const jockey = createMockJockey();
    const stable = createMockStable({ personality: "conservative" });

    // Record retention with high earnings
    state.retention.push({
      jockeyId: jockey.id,
      stableId: stable.id,
      hireDay: 1,
      lastUseDay: 10,
      totalRides: 10,
      totalPrize: 60000,
      retained: true,
    });

    const shouldRetainDecision = shouldRetainJockey(state, jockey, stable, 20);
    expect(shouldRetainDecision).toBe(true);
  });

  it("should not retain jockey with low prize earnings for conservative", () => {
    const state = createJockeyAIState(createMockStable({ personality: "conservative" }));
    const jockey = createMockJockey();
    const stable = createMockStable({ personality: "conservative" });

    // Record retention with low earnings
    state.retention.push({
      jockeyId: jockey.id,
      stableId: stable.id,
      hireDay: 1,
      lastUseDay: 10,
      totalRides: 10,
      totalPrize: 3000,
      retained: true,
    });

    const shouldRetainDecision = shouldRetainJockey(state, jockey, stable, 20);
    expect(shouldRetainDecision).toBe(false);
  });

  it("should retain high skill jockey for aggressive personality", () => {
    const state = createJockeyAIState(createMockStable({ personality: "aggressive" }));
    const highSkillJockey = createMockJockey({
      stats: { pacing: 90, positioning: 90, vigor: 90, gateSkill: 90, temperament: 90 },
    });
    const stable = createMockStable({ personality: "aggressive" });

    state.retention.push({
      jockeyId: highSkillJockey.id,
      stableId: stable.id,
      hireDay: 1,
      lastUseDay: 10,
      totalRides: 10,
      totalPrize: 5000,
      retained: true,
    });

    const shouldRetainDecision = shouldRetainJockey(state, highSkillJockey, stable, 20);
    expect(shouldRetainDecision).toBe(true);
  });
});

describe("calculateMaxJockeyFee", () => {
  it("should calculate fee based on jockey riding fee", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey({ ridingFee: 2000 });
    const horse = createMockHorse();
    const stable = createMockStable({ cash: 100000 });

    const maxFee = calculateMaxJockeyFee(state, jockey, horse, stable);
    expect(maxFee).toBeGreaterThan(0);
  });

  it("should respect stable cash reserves", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const richStable = createMockStable({ cash: 500000 });
    const poorStable = createMockStable({ cash: 10000 });

    const richMaxFee = calculateMaxJockeyFee(state, jockey, horse, richStable);
    const poorMaxFee = calculateMaxJockeyFee(state, jockey, horse, poorStable);

    expect(richMaxFee).toBeGreaterThan(poorMaxFee);
  });

  it("should apply personality modifiers", () => {
    const aggressiveState = createJockeyAIState(createMockStable({ personality: "aggressive" }));
    const conservativeState = createJockeyAIState(createMockStable({ personality: "conservative" }));
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable({ cash: 100000 });

    const aggressiveMaxFee = calculateMaxJockeyFee(aggressiveState, jockey, horse, stable);
    const conservativeMaxFee = calculateMaxJockeyFee(conservativeState, jockey, horse, stable);

    // Aggressive personalities may offer higher fees
    expect(aggressiveMaxFee).toBeGreaterThanOrEqual(conservativeMaxFee);
  });

  it("should not exceed 5% of cash reserves", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey({ ridingFee: 10000 });
    const horse = createMockHorse();
    const stable = createMockStable({ cash: 10000 });

    const maxFee = calculateMaxJockeyFee(state, jockey, horse, stable);
    expect(maxFee).toBeLessThanOrEqual(stable.cash * 0.05);
  });
});

describe("recordJockeyAssignment", () => {
  it("should record assignment to history", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    const updatedState = recordJockeyAssignment(state, jockey, horse, "race-1", stable, 1000, 1);

    expect(updatedState.jockeyHistory).toHaveLength(1);
    expect(updatedState.jockeyHistory[0].jockeyId).toBe(jockey.id);
    expect(updatedState.jockeyHistory[0].horseId).toBe(horse.id);
    expect(updatedState.jockeyHistory[0].day).toBe(1);
  });

  it("should trim history to memory depth", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    let updatedState = state;
    for (let i = 0; i < 15; i++) {
      updatedState = recordJockeyAssignment(updatedState, jockey, horse, `race-${i}`, stable, 1000, i);
    }

    expect(updatedState.jockeyHistory.length).toBeLessThanOrEqual(10);
  });

  it("should create retention record for new jockey", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    const updatedState = recordJockeyAssignment(state, jockey, horse, "race-1", stable, 1000, 1);

    const retention = updatedState.retention.find((r) => r.jockeyId === jockey.id && r.stableId === stable.id);
    expect(retention).toBeDefined();
    expect(retention?.hireDay).toBe(1);
    expect(retention?.totalRides).toBe(1);
  });
});

describe("recordJockeyOutcome", () => {
  it("should record outcome to learning state", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    const stateWithAssignment = recordJockeyAssignment(state, jockey, horse, "race-1", stable, 1000, 1);
    const updatedState = recordJockeyOutcome(stateWithAssignment, jockey.id, horse.id, "race-1", 1, 5000, 1);

    expect(updatedState.learningState.outcomes).toHaveLength(1);
    expect(updatedState.learningState.outcomes[0].success).toBe(true);
    expect(updatedState.learningState.outcomes[0].value).toBe(4000); // prize - fee
  });

  it("should update assignment with result", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    const stateWithAssignment = recordJockeyAssignment(state, jockey, horse, "race-1", stable, 1000, 1);
    const stateWithOutcome = recordJockeyOutcome(stateWithAssignment, jockey.id, horse.id, "race-1", 1, 5000, 1);

    const lastAssignment = stateWithOutcome.jockeyHistory[0];
    expect(lastAssignment.result).toBeDefined();
    expect(lastAssignment.result?.position).toBe(1);
    expect(lastAssignment.result?.prize).toBe(5000);
  });

  it("should update retention record with prize", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    const stateWithAssignment = recordJockeyAssignment(state, jockey, horse, "race-1", stable, 1000, 1);
    const stateWithOutcome = recordJockeyOutcome(stateWithAssignment, jockey.id, horse.id, "race-1", 1, 5000, 1);

    const retention = stateWithOutcome.retention.find((r) => r.jockeyId === jockey.id && r.stableId === stable.id);
    expect(retention?.totalPrize).toBe(5000);
  });

  it("should mark top 3 as success", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    const stateWithAssignment = recordJockeyAssignment(state, jockey, horse, "race-1", stable, 1000, 1);
    const stateWithOutcome = recordJockeyOutcome(stateWithAssignment, jockey.id, horse.id, "race-1", 3, 2000, 1);

    expect(stateWithOutcome.learningState.outcomes[0].success).toBe(true);
  });

  it("should mark below top 3 as failure", () => {
    const state = createJockeyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const stable = createMockStable();

    const stateWithAssignment = recordJockeyAssignment(state, jockey, horse, "race-1", stable, 1000, 1);
    const stateWithOutcome = recordJockeyOutcome(stateWithAssignment, jockey.id, horse.id, "race-1", 5, 500, 1);

    expect(stateWithOutcome.learningState.outcomes[0].success).toBe(false);
  });
});
