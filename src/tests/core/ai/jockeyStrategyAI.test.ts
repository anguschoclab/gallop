/**
 * Tests for Jockey Strategy AI
 * Tests running style, aggressiveness, and tactical move decisions
 */

import { describe, it, expect } from "vitest";
import {
  createJockeyStrategyAIState,
  calculateOptimalRunningStyle,
  calculateJockeyAggressiveness,
  shouldMakeTacticalMove,
  recordRaceStrategy,
  getStrategyInsights,
} from "@/core/ai/jockeyStrategyAI";
import type { Jockey, Horse, Race, Stable } from "@/game/types";

// Mock data setup
function createMockJockey(overrides: Partial<Jockey> = {}): Jockey {
  return {
    id: "jockey-1",
    name: "Test Jockey",
    age: 30,
    archetype: "front_runner",
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

function createMockRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 100,
    distance: 1600,
    surface: "Dirt",
    raceClass: "Stakes",
    entryFee: 100,
    purse: 100000,
    fieldSize: 8,
    graded: { key: "test", grade: "G3", track: "Test Track", trackId: "track-1", surface: "Dirt" },
    entries: [],
    resolved: false,
    ...overrides,
  };
}

describe("createJockeyStrategyAIState", () => {
  it("should initialize AI state for a stable", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const state = createJockeyStrategyAIState(stable);

    expect(state.personalityState.personality).toBe("aggressive");
    expect(state.learningState.outcomes).toEqual([]);
    expect(state.strategyHistory).toEqual([]);
  });

  it("should have different personality states for different personalities", () => {
    const aggressiveState = createJockeyStrategyAIState(createMockStable({ personality: "aggressive" }));
    const conservativeState = createJockeyStrategyAIState(createMockStable({ personality: "conservative" }));

    expect(aggressiveState.personalityState.personality).toBe("aggressive");
    expect(conservativeState.personalityState.personality).toBe("conservative");
  });
});

describe("calculateOptimalRunningStyle", () => {
  it("should calculate optimal running style", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey({ archetype: "front_runner" });
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    const style = calculateOptimalRunningStyle(state, horse, race, jockey, stable);
    expect(style).toBeDefined();
    expect(["E", "EP", "P", "S"]).toContain(style);
  });

  it("should prefer front running for front runner jockeys", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const frontRunner = createMockJockey({ archetype: "front_runner" });
    const horse = createMockHorse({ energy: 90 });
    const race = createMockRace({ distance: 1200 });
    const stable = createMockStable();

    const style = calculateOptimalRunningStyle(state, horse, race, frontRunner, stable);
    expect(style).toBe("E");
  });

  it("should prefer stalking for closer jockeys", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const closer = createMockJockey({ archetype: "closer" });
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    const style = calculateOptimalRunningStyle(state, horse, race, closer, stable);
    expect(style).toBe("S");
  });

  it("should consider horse energy for style selection", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const highEnergyHorse = createMockHorse({ energy: 90 });
    const lowEnergyHorse = createMockHorse({ energy: 50 });
    const race = createMockRace();
    const stable = createMockStable();

    const highEnergyStyle = calculateOptimalRunningStyle(state, highEnergyHorse, race, jockey, stable);
    const lowEnergyStyle = calculateOptimalRunningStyle(state, lowEnergyHorse, race, jockey, stable);

    expect(highEnergyStyle).toBeDefined();
    expect(lowEnergyStyle).toBeDefined();
  });
});

describe("calculateJockeyAggressiveness", () => {
  it("should calculate aggressiveness between 0 and 1", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    const aggressiveness = calculateJockeyAggressiveness(state, horse, race, jockey, stable);
    expect(aggressiveness).toBeGreaterThanOrEqual(0);
    expect(aggressiveness).toBeLessThanOrEqual(1);
  });

  it("should be higher for aggressive personalities", () => {
    const aggressiveState = createJockeyStrategyAIState(createMockStable({ personality: "aggressive" }));
    const conservativeState = createJockeyStrategyAIState(createMockStable({ personality: "conservative" }));
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    const aggressiveAggr = calculateJockeyAggressiveness(aggressiveState, horse, race, jockey, stable);
    const conservativeAggr = calculateJockeyAggressiveness(conservativeState, horse, race, jockey, stable);

    expect(aggressiveAggr).toBeGreaterThan(conservativeAggr);
  });

  it("should be higher for shorter races", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const shortRace = createMockRace({ distance: 1000 });
    const longRace = createMockRace({ distance: 2000 });
    const stable = createMockStable();

    const shortAggr = calculateJockeyAggressiveness(state, horse, shortRace, jockey, stable);
    const longAggr = calculateJockeyAggressiveness(state, horse, longRace, jockey, stable);

    expect(shortAggr).toBeGreaterThan(longAggr);
  });

  it("should be higher for high-quality horses", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const highQualityHorse = createMockHorse({ stats: { speed: 85, stamina: 85, acceleration: 85, consistency: 85 } });
    const lowQualityHorse = createMockHorse({ stats: { speed: 60, stamina: 60, acceleration: 60, consistency: 60 } });
    const race = createMockRace();
    const stable = createMockStable();

    const highAggr = calculateJockeyAggressiveness(state, highQualityHorse, race, jockey, stable);
    const lowAggr = calculateJockeyAggressiveness(state, lowQualityHorse, race, jockey, stable);

    expect(highAggr).toBeGreaterThan(lowAggr);
  });
});

describe("shouldMakeTacticalMove", () => {
  it("should determine if tactical move should be made", () => {
    const state = createJockeyStrategyAIState(createMockStable({ personality: "aggressive" }));
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();

    const decision = shouldMakeTacticalMove(state, horse, race, jockey, 5, 0.5);
    expect(decision).toBeDefined();
    expect(typeof decision.shouldMove).toBe("boolean");
    expect(typeof decision.targetPosition).toBe("number");
    expect(["early", "middle", "late"]).toContain(decision.moveType);
  });

  it("should recommend early move for aggressive personalities when behind", () => {
    const state = createJockeyStrategyAIState(createMockStable({ personality: "aggressive" }));
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();

    const decision = shouldMakeTacticalMove(state, horse, race, jockey, 5, 0.2);
    expect(decision.shouldMove).toBe(true);
    expect(decision.moveType).toBe("early");
  });

  it("should not recommend move for conservative personalities early", () => {
    const state = createJockeyStrategyAIState(createMockStable({ personality: "conservative" }));
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();

    const decision = shouldMakeTacticalMove(state, horse, race, jockey, 5, 0.2);
    expect(decision.shouldMove).toBe(false);
  });

  it("should recommend late move with high energy", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse({ energy: 80 });
    const race = createMockRace();

    const decision = shouldMakeTacticalMove(state, horse, race, jockey, 5, 0.8);
    expect(decision.shouldMove).toBe(true);
    expect(decision.moveType).toBe("late");
  });

  it("should not recommend late move with low energy", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse({ energy: 40 });
    const race = createMockRace();

    const decision = shouldMakeTacticalMove(state, horse, race, jockey, 5, 0.8);
    expect(decision.shouldMove).toBe(false);
  });
});

describe("recordRaceStrategy", () => {
  it("should record race strategy to history", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    const updatedState = recordRaceStrategy(state, horse, race, jockey, stable, "E", 0.7, 1, 100);

    expect(updatedState.strategyHistory).toHaveLength(1);
    expect(updatedState.strategyHistory[0].runningStyle).toBe("E");
    expect(updatedState.strategyHistory[0].position).toBe(1);
  });

  it("should trim history to memory depth", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    let updatedState = state;
    for (let i = 0; i < 15; i++) {
      updatedState = recordRaceStrategy(updatedState, horse, race, jockey, stable, "E", 0.7, 1, 100 + i);
    }

    expect(updatedState.strategyHistory.length).toBeLessThanOrEqual(10);
  });

  it("should update learning state", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    const updatedState = recordRaceStrategy(state, horse, race, jockey, stable, "E", 0.7, 1, 100);

    expect(updatedState.learningState.outcomes).toHaveLength(1);
  });

  it("should not mutate original state", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();
    const originalHistoryLength = state.strategyHistory.length;

    recordRaceStrategy(state, horse, race, jockey, stable, "E", 0.7, 1, 100);

    expect(state.strategyHistory).toHaveLength(originalHistoryLength);
  });
});

describe("getStrategyInsights", () => {
  it("should return zero insights for empty history", () => {
    const state = createJockeyStrategyAIState(createMockStable());

    const insights = getStrategyInsights(state, "stable-1");

    expect(insights.totalRaces).toBe(0);
    expect(insights.avgPosition).toBe(5);
    expect(insights.styleUsage.E).toBe(0);
    expect(insights.styleUsage.EP).toBe(0);
    expect(insights.styleUsage.P).toBe(0);
    expect(insights.styleUsage.S).toBe(0);
    expect(insights.avgAggressiveness).toBe(0.5);
  });

  it("should return insights from strategy history", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    let updatedState = state;
    // Record multiple strategies
    for (let i = 0; i < 5; i++) {
      const style = i < 2 ? "E" : i < 4 ? "P" : "S";
      updatedState = recordRaceStrategy(updatedState, horse, race, jockey, stable, style, 0.7, i + 1, 100 + i);
    }

    const insights = getStrategyInsights(updatedState, stable.id);

    expect(insights.totalRaces).toBe(5);
    expect(insights.avgPosition).toBe(3);
    expect(insights.styleUsage.E).toBe(2);
    expect(insights.styleUsage.P).toBe(2);
    expect(insights.styleUsage.S).toBe(1);
    expect(insights.avgAggressiveness).toBe(0.7);
  });

  it("should filter by stable ID", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable1 = createMockStable({ id: "stable-1" });
    const stable2 = createMockStable({ id: "stable-2" });

    let updatedState = state;
    updatedState = recordRaceStrategy(updatedState, horse, race, jockey, stable1, "E", 0.7, 1, 100);
    updatedState = recordRaceStrategy(updatedState, horse, race, jockey, stable2, "P", 0.5, 2, 100);

    const insights1 = getStrategyInsights(updatedState, "stable-1");
    const insights2 = getStrategyInsights(updatedState, "stable-2");

    expect(insights1.totalRaces).toBe(1);
    expect(insights2.totalRaces).toBe(1);
  });
});
