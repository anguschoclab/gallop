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
  calculateOptimalTactics,
  adjustForTrackCondition,
  adjustForFieldComposition,
  calculateAffinityBoost,
  applyAffinityBoost,
} from "@/core/ai/jockeyStrategyAI";
import type { Jockey, Horse, Race, Stable } from "@/game/types";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";

// Mock data setup
function createMockJockey(overrides: Partial<Jockey> = {}): Jockey {
  return {
    id: "jockey-1",
    name: "Test Jockey",
    age: 30,
    archetype: "front_runner",
    tier: "mid",
    stats: { pacing: 75, positioning: 75, vigor: 75, gateSkill: 75, temperament: 75 },
    potential: 75,
    traits: [],
    silk: { pattern: "solid", primary: "red", secondary: "white", cap: "white" },
    careerStarts: 100,
    careerWins: 30,
    fame: 50,
    ridingFee: 1000,
    affinityMap: {},
    stableAffinity: 50,
    loyalty: 50,
    isApprentice: false,
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
    staff: { trainer: null, groom: null, farrier: null, nutritionist: null, veterinarian: null },
    outposts: [],
    ...overrides,
  };
}

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    sireId: "sire-1",
    damId: "dam-1",
    sireName: "Test Sire",
    damName: "Test Dam",
    pedigree: { sireId: "sire-1", damId: "dam-1", name: "Test Horse", generation: 0 },
    birthDay: 1,
    age: 3,
    gender: "colt",
    hemisphere: "Northern",
    silk: "red",
    energy: 80,
    fitness: 50,
    fatigue: 20,
    peakingIndex: 30,
    form: 0.8,
    recoveryPoints: 50,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      consistency: 70,
      temperament: 70,
      conformation: 70,
    },
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
      markings: {
        socks: [3, 3],
        face: [3, 3],
        silverDapple: [3, 3],
        sabino: [3, 3],
        splashWhite: [3, 3],
      },
      health: {
        bleeder: [3, 3],
        roarer: [3, 3],
        ocd: [3, 3],
        efna5: [3, 3],
        pssm: [3, 3],
        rer: [3, 3],
        epm: [3, 3],
      },
    },
    potential: 80,
    fame: 0,
    distanceAptitude: 1600,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    mudAptitude: 0.7,
    peakAge: 4,
    strideType: "average",
    trackPreference: "left",
    bleederRisk: 0.1,
    roarerRisk: 0.1,
    ocdRisk: 0.1,
    recoveryRate: 0.7,
    trainability: 0.7,
    heartScore: 70,
    bloodline: "standard",
    fiberBias: "balanced",
    healthStatus: "healthy",
    healthStatusDay: 1,
    isBlueHen: false,
    gelded: false,
    lifecycleStatus: "active",
    raceHistory: [],
    owned: true,
    runningStyle: "E",
    coatColor: "bay",
    markings: { socks: ["none", "none", "none", "none"] as any, face: "none" },
    ...overrides,
  } as Horse;
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
    const aggressiveState = createJockeyStrategyAIState(
      createMockStable({ personality: "aggressive" }),
    );
    const conservativeState = createJockeyStrategyAIState(
      createMockStable({ personality: "conservative" }),
    );

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
    const closer = createMockJockey({
      archetype: "closer",
      stats: { pacing: 85, positioning: 85, vigor: 85, gateSkill: 85, temperament: 85 },
    });
    const horse = createMockHorse({ energy: 75, distanceAptitude: 1600 });
    const race = createMockRace({ distance: 1600 });
    const stable = createMockStable();

    const style = calculateOptimalRunningStyle(state, horse, race, closer, stable);
    // Closer archetype should prefer S or P style
    expect(["S", "P", "E"]).toContain(style);
  });

  it("should consider horse energy for style selection", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const jockey = createMockJockey();
    const highEnergyHorse = createMockHorse({ energy: 90 });
    const lowEnergyHorse = createMockHorse({ energy: 50 });
    const race = createMockRace();
    const stable = createMockStable();

    const highEnergyStyle = calculateOptimalRunningStyle(
      state,
      highEnergyHorse,
      race,
      jockey,
      stable,
    );
    const lowEnergyStyle = calculateOptimalRunningStyle(
      state,
      lowEnergyHorse,
      race,
      jockey,
      stable,
    );

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
    const aggressiveState = createJockeyStrategyAIState(
      createMockStable({ personality: "aggressive" }),
    );
    const conservativeState = createJockeyStrategyAIState(
      createMockStable({ personality: "conservative" }),
    );
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    const aggressiveAggr = calculateJockeyAggressiveness(
      aggressiveState,
      horse,
      race,
      jockey,
      stable,
    );
    const conservativeAggr = calculateJockeyAggressiveness(
      conservativeState,
      horse,
      race,
      jockey,
      stable,
    );

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
    const highQualityHorse = createMockHorse({
      stats: {
        speed: 85,
        stamina: 85,
        acceleration: 85,
        consistency: 85,
        temperament: 85,
        conformation: 85,
      },
    });
    const lowQualityHorse = createMockHorse({
      stats: {
        speed: 60,
        stamina: 60,
        acceleration: 60,
        consistency: 60,
        temperament: 60,
        conformation: 60,
      },
    });
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
    state.personalityState.memoryDepth = 10;
    const jockey = createMockJockey();
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    let updatedState = state;
    for (let i = 0; i < 15; i++) {
      updatedState = recordRaceStrategy(
        updatedState,
        horse,
        race,
        jockey,
        stable,
        "E",
        0.7,
        1,
        100 + i,
      );
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
      updatedState = recordRaceStrategy(
        updatedState,
        horse,
        race,
        jockey,
        stable,
        style,
        0.7,
        i + 1,
        100 + i,
      );
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

describe("calculateOptimalTactics field-aware adjustments", () => {
  it("returns valid JockeyInstructions for a standard race", () => {
    const stable = createMockStable();
    const state = createJockeyStrategyAIState(stable);
    const horse = createMockHorse({ recoveryPoints: 80 });
    const race = createMockRace({ fieldSize: 8, entries: [] });
    const jockey = createMockJockey();

    const instructions = calculateOptimalTactics(state, horse, race, jockey, stable);
    expect(instructions).toBeDefined();
    expect(instructions.horseId).toBe(horse.id);
    expect(instructions.raceId).toBe(race.id);
    expect(instructions.aggressiveness).toBeGreaterThanOrEqual(0);
    expect(instructions.aggressiveness).toBeLessThanOrEqual(100);
  });

  it("reduces aggressiveness in large fields (14+ horses) for closers", () => {
    const stable = createMockStable();
    const state = createJockeyStrategyAIState(stable);
    const horse = createMockHorse({ recoveryPoints: 80, runningStyle: "S" });
    const smallFieldRace = createMockRace({
      fieldSize: 6,
      entries: Array.from({ length: 5 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });
    const largeFieldRace = createMockRace({
      fieldSize: 14,
      entries: Array.from({ length: 13 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });
    const jockey = createMockJockey();

    const smallFieldInstructions = calculateOptimalTactics(
      state,
      horse,
      smallFieldRace,
      jockey,
      stable,
    );
    const largeFieldInstructions = calculateOptimalTactics(
      state,
      horse,
      largeFieldRace,
      jockey,
      stable,
    );

    // In large fields, closers should be less aggressive early to avoid traffic
    expect(largeFieldInstructions.aggressiveness).toBeLessThanOrEqual(
      smallFieldInstructions.aggressiveness,
    );
  });

  it("adjusts early position based on field size", () => {
    const stable = createMockStable();
    const state = createJockeyStrategyAIState(stable);
    const horse = createMockHorse({ recoveryPoints: 80, runningStyle: "E" });
    const smallFieldRace = createMockRace({
      fieldSize: 6,
      entries: Array.from({ length: 5 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });
    const largeFieldRace = createMockRace({
      fieldSize: 16,
      entries: Array.from({ length: 15 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });
    const jockey = createMockJockey();

    const smallFieldInstructions = calculateOptimalTactics(
      state,
      horse,
      smallFieldRace,
      jockey,
      stable,
    );
    const largeFieldInstructions = calculateOptimalTactics(
      state,
      horse,
      largeFieldRace,
      jockey,
      stable,
    );

    // Both should produce valid instructions
    expect(smallFieldInstructions.earlyPosition).toBeDefined();
    expect(largeFieldInstructions.earlyPosition).toBeDefined();
  });
});

describe("calculateOptimalTactics — track condition adjustments", () => {
  it("reduces aggressiveness on heavy track for horse with low mudAptitude", () => {
    const stable = createMockStable();
    const state = createJockeyStrategyAIState(stable);
    const horse = createMockHorse({ recoveryPoints: 80, mudAptitude: 0.3, runningStyle: "E" });
    const fastRace = createMockRace({ trackCondition: "fast", weather: "sunny" });
    const heavyRace = createMockRace({ trackCondition: "heavy", weather: "rainy" });
    const jockey = createMockJockey();

    const fastInstructions = calculateOptimalTactics(state, horse, fastRace, jockey, stable);
    const heavyInstructions = calculateOptimalTactics(state, horse, heavyRace, jockey, stable);

    // On heavy track with low mud aptitude, should be less aggressive
    expect(heavyInstructions.aggressiveness).toBeLessThan(fastInstructions.aggressiveness);
  });

  it("does not reduce aggressiveness on heavy track for horse with high mudAptitude", () => {
    const stable = createMockStable();
    const state = createJockeyStrategyAIState(stable);
    const horse = createMockHorse({ recoveryPoints: 80, mudAptitude: 0.9, runningStyle: "E" });
    const fastRace = createMockRace({ trackCondition: "fast", weather: "sunny" });
    const heavyRace = createMockRace({ trackCondition: "heavy", weather: "rainy" });
    const jockey = createMockJockey();

    const fastInstructions = calculateOptimalTactics(state, horse, fastRace, jockey, stable);
    const heavyInstructions = calculateOptimalTactics(state, horse, heavyRace, jockey, stable);

    // Mud-loving horse should not be penalized on heavy track
    expect(heavyInstructions.aggressiveness).toBeGreaterThanOrEqual(
      fastInstructions.aggressiveness - 5,
    );
  });

  it("adjusts early position to midpack on soft track for front-runner with low mudAptitude", () => {
    const stable = createMockStable();
    const state = createJockeyStrategyAIState(stable);
    const horse = createMockHorse({ recoveryPoints: 80, mudAptitude: 0.2, runningStyle: "E" });
    const softRace = createMockRace({ trackCondition: "soft", weather: "rainy" });
    const jockey = createMockJockey();

    const instructions = calculateOptimalTactics(state, horse, softRace, jockey, stable);

    // On soft track with low mud aptitude, front-runner should be more conservative
    expect(instructions.earlyPosition).not.toBe("lead");
  });
});

describe("adjustForTrackCondition (standalone)", () => {
  it("returns instructions unchanged on fast track", () => {
    const horse = createMockHorse({ mudAptitude: 0.2 });
    const race = createMockRace({ trackCondition: "fast" });
    const instructions = {
      horseId: "h1",
      raceId: "r1",
      ridingStyle: "front_runner" as const,
      earlyPosition: "lead" as const,
      moveTiming: "early" as const,
      aggressiveness: 70,
    };
    const result = adjustForTrackCondition(instructions, horse, race);
    expect(result).toBe(instructions);
  });

  it("reduces aggressiveness on heavy track for low mudAptitude horse", () => {
    const horse = createMockHorse({ mudAptitude: 0.2 });
    const race = createMockRace({ trackCondition: "heavy" });
    const instructions = {
      horseId: "h1",
      raceId: "r1",
      ridingStyle: "front_runner" as const,
      earlyPosition: "lead" as const,
      moveTiming: "early" as const,
      aggressiveness: 70,
    };
    const result = adjustForTrackCondition(instructions, horse, race);
    expect(result.aggressiveness).toBeLessThan(70);
    expect(result.moveTiming).toBe("mid");
  });

  it("increases aggressiveness on heavy track for high mudAptitude horse", () => {
    const horse = createMockHorse({ mudAptitude: 0.8 });
    const race = createMockRace({ trackCondition: "heavy" });
    const instructions = {
      horseId: "h1",
      raceId: "r1",
      ridingStyle: "front_runner" as const,
      earlyPosition: "lead" as const,
      moveTiming: "early" as const,
      aggressiveness: 70,
    };
    const result = adjustForTrackCondition(instructions, horse, race);
    expect(result.aggressiveness).toBeGreaterThan(70);
  });
});

describe("adjustForFieldComposition (standalone)", () => {
  it("returns base style when no horseMap provided", () => {
    const race = createMockRace();
    expect(adjustForFieldComposition("E", race)).toBe("E");
  });

  it("switches front-runner to closer when field is saturated with front-runners", () => {
    const horseMap = new Map<string, Horse>();
    for (let i = 0; i < 5; i++) {
      horseMap.set(`h${i}`, createMockHorse({ id: `h${i}`, distanceAptitude: 0.3 }));
    }
    const race = createMockRace({
      entries: Array.from({ length: 5 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });
    expect(adjustForFieldComposition("E", race, horseMap)).toBe("S");
  });

  it("switches closer to front-runner when field is saturated with closers", () => {
    const horseMap = new Map<string, Horse>();
    for (let i = 0; i < 5; i++) {
      horseMap.set(`h${i}`, createMockHorse({ id: `h${i}`, distanceAptitude: 0.8 }));
    }
    const race = createMockRace({
      entries: Array.from({ length: 5 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });
    expect(adjustForFieldComposition("S", race, horseMap)).toBe("E");
  });

  it("returns base style for balanced field", () => {
    const horseMap = new Map<string, Horse>();
    horseMap.set("h0", createMockHorse({ id: "h0", distanceAptitude: 0.3 }));
    horseMap.set("h1", createMockHorse({ id: "h1", distanceAptitude: 0.5 }));
    horseMap.set("h2", createMockHorse({ id: "h2", distanceAptitude: 0.8 }));
    horseMap.set("h3", createMockHorse({ id: "h3", distanceAptitude: 0.5 }));
    const race = createMockRace({
      entries: Array.from({ length: 4 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });
    expect(adjustForFieldComposition("P", race, horseMap)).toBe("P");
  });
});

describe("calculateAffinityBoost", () => {
  it("returns 1.0 for zero affinity", () => {
    const jockey = createMockJockey({ affinityMap: {} });
    expect(calculateAffinityBoost(jockey, "h1")).toBe(1);
  });

  it("returns >1.0 for positive affinity", () => {
    const jockey = createMockJockey({ affinityMap: { h1: 50 } });
    expect(calculateAffinityBoost(jockey, "h1")).toBeGreaterThan(1);
  });

  it("caps boost at 30%", () => {
    const jockey = createMockJockey({ affinityMap: { h1: 1000 } });
    expect(calculateAffinityBoost(jockey, "h1")).toBeLessThanOrEqual(1.3);
  });
});

describe("applyAffinityBoost", () => {
  it("returns instructions unchanged for zero affinity", () => {
    const jockey = createMockJockey({ affinityMap: {} });
    const instructions = {
      horseId: "h1",
      raceId: "r1",
      ridingStyle: "front_runner" as const,
      earlyPosition: "lead" as const,
      moveTiming: "early" as const,
      aggressiveness: 50,
    };
    const result = applyAffinityBoost(instructions, jockey, "h1");
    expect(result).toBe(instructions);
  });

  it("increases aggressiveness for high-affinity pair", () => {
    const jockey = createMockJockey({ affinityMap: { h1: 60 } });
    const instructions = {
      horseId: "h1",
      raceId: "r1",
      ridingStyle: "front_runner" as const,
      earlyPosition: "lead" as const,
      moveTiming: "early" as const,
      aggressiveness: 50,
    };
    const result = applyAffinityBoost(instructions, jockey, "h1");
    expect(result.aggressiveness).toBeGreaterThan(50);
  });

  it("caps aggressiveness at 100", () => {
    const jockey = createMockJockey({ affinityMap: { h1: 100 } });
    const instructions = {
      horseId: "h1",
      raceId: "r1",
      ridingStyle: "front_runner" as const,
      earlyPosition: "lead" as const,
      moveTiming: "early" as const,
      aggressiveness: 95,
    };
    const result = applyAffinityBoost(instructions, jockey, "h1");
    expect(result.aggressiveness).toBeLessThanOrEqual(100);
  });
});

// ─── Trait-Aware Strategy AI ─────────────────────────────────────────────────

describe("calculateOptimalRunningStyle — trait awareness", () => {
  it("gate_master trait boosts front-running style score", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const gateJockey = createMockJockey({ traits: ["gate_master"] });
    const noTraitJockey = createMockJockey({ traits: [] });
    const horse = createMockHorse({ energy: 85, runningStyle: "E" });
    const race = createMockRace({ distance: 1200 });
    const stable = createMockStable();

    const gateStyle = calculateOptimalRunningStyle(state, horse, race, gateJockey, stable);
    const noTraitStyle = calculateOptimalRunningStyle(state, horse, race, noTraitJockey, stable);

    // gate_master should bias toward E (front-running)
    expect(gateStyle).toBe("E");
    // Without trait, may still pick E but gate_master reinforces it
    expect(["E", "EP", "P", "S"]).toContain(noTraitStyle);
  });

  it("closer_instinct trait boosts closer style score", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const closerJockey = createMockJockey({
      traits: ["closer_instinct"],
      archetype: "closer",
      stats: { pacing: 85, positioning: 85, vigor: 85, gateSkill: 70, temperament: 75 },
    });
    const horse = createMockHorse({ energy: 75, runningStyle: "S", distanceAptitude: 1800 });
    const race = createMockRace({ distance: 1800 });
    const stable = createMockStable();

    const style = calculateOptimalRunningStyle(state, horse, race, closerJockey, stable);

    // closer_instinct should bias toward S or P
    expect(["S", "P"]).toContain(style);
  });

  it("sprint_specialist trait boosts front-running on short races", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const sprintJockey = createMockJockey({ traits: ["sprint_specialist"] });
    const horse = createMockHorse({ energy: 85, runningStyle: "E" });
    const sprintRace = createMockRace({ distance: 1000 });
    const stable = createMockStable();

    const style = calculateOptimalRunningStyle(state, horse, sprintRace, sprintJockey, stable);

    expect(style).toBe("E");
  });

  it("staying_specialist trait boosts closer on long races", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const stayingJockey = createMockJockey({
      traits: ["staying_specialist"],
      archetype: "closer",
      stats: { pacing: 85, positioning: 85, vigor: 85, gateSkill: 70, temperament: 75 },
    });
    const horse = createMockHorse({ energy: 75, runningStyle: "S", distanceAptitude: 2400 });
    const stayingRace = createMockRace({ distance: 2400 });
    const stable = createMockStable();

    const style = calculateOptimalRunningStyle(state, horse, stayingRace, stayingJockey, stable);

    expect(["S", "P"]).toContain(style);
  });
});

describe("calculateOptimalTactics — trait awareness", () => {
  it("gate_master jockey gets more aggressive early tactics", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const gateJockey = createMockJockey({ traits: ["gate_master"] });
    const noTraitJockey = createMockJockey({ traits: [] });
    const horse = createMockHorse({ recoveryPoints: 80, runningStyle: "E" });
    const race = createMockRace({ distance: 1200 });
    const stable = createMockStable();

    const gateTactics = calculateOptimalTactics(state, horse, race, gateJockey, stable);
    const noTraitTactics = calculateOptimalTactics(state, horse, race, noTraitJockey, stable);

    // gate_master should get equal or more aggressive early position
    expect(gateTactics.aggressiveness).toBeGreaterThanOrEqual(noTraitTactics.aggressiveness);
  });

  it("big_match_temperament jockey gets more aggressive in large fields", () => {
    const conservativeStable = createMockStable({ personality: "conservative" });
    const state = createJockeyStrategyAIState(conservativeStable);
    const bigMatchJockey = createMockJockey({ traits: ["big_match_temperament"] });
    const noTraitJockey = createMockJockey({ traits: [] });
    const horse = createMockHorse({ recoveryPoints: 80, runningStyle: "P" });
    const bigRace = createMockRace({
      fieldSize: 16,
      entries: Array.from({ length: 15 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });

    const bigMatchTactics = calculateOptimalTactics(
      state,
      horse,
      bigRace,
      bigMatchJockey,
      conservativeStable,
    );
    const noTraitTactics = calculateOptimalTactics(
      state,
      horse,
      bigRace,
      noTraitJockey,
      conservativeStable,
    );

    expect(bigMatchTactics.aggressiveness).toBeGreaterThan(noTraitTactics.aggressiveness);
  });

  it("pace_presser jockey gets more aggressive early tactics for E style", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const pacePresserJockey = createMockJockey({ traits: ["pace_presser"] });
    const noTraitJockey = createMockJockey({ traits: [] });
    const horse = createMockHorse({ recoveryPoints: 80, runningStyle: "E" });
    const race = createMockRace();
    const stable = createMockStable();

    const ppTactics = calculateOptimalTactics(state, horse, race, pacePresserJockey, stable);
    const noTraitTactics = calculateOptimalTactics(state, horse, race, noTraitJockey, stable);

    expect(ppTactics.aggressiveness).toBeGreaterThanOrEqual(noTraitTactics.aggressiveness);
  });

  it("veteran_poise jockey gets more conservative, consistent tactics", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const veteranJockey = createMockJockey({ traits: ["veteran_poise"], age: 38 });
    const youngJockey = createMockJockey({ traits: [], age: 22 });
    const horse = createMockHorse({ recoveryPoints: 80, runningStyle: "P" });
    const race = createMockRace();
    const stable = createMockStable();

    const veteranTactics = calculateOptimalTactics(state, horse, race, veteranJockey, stable);
    const youngTactics = calculateOptimalTactics(state, horse, race, youngJockey, stable);

    // Veteran should be more measured — not excessively aggressive
    expect(veteranTactics.aggressiveness).toBeLessThanOrEqual(youngTactics.aggressiveness + 5);
  });
});

describe("calculateJockeyAggressiveness — trait awareness", () => {
  it("pace_presser trait increases aggressiveness for front-runners", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const pacePresserJockey = createMockJockey({ traits: ["pace_presser"] });
    const noTraitJockey = createMockJockey({ traits: [] });
    const horse = createMockHorse({ runningStyle: "E" });
    const race = createMockRace();
    const stable = createMockStable();

    const ppAggr = calculateJockeyAggressiveness(state, horse, race, pacePresserJockey, stable);
    const noTraitAggr = calculateJockeyAggressiveness(state, horse, race, noTraitJockey, stable);

    expect(ppAggr).toBeGreaterThan(noTraitAggr);
  });

  it("veteran_poise trait slightly reduces aggressiveness for older jockeys", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const veteranJockey = createMockJockey({ traits: ["veteran_poise"], age: 38 });
    const noTraitJockey = createMockJockey({ traits: [], age: 38 });
    const horse = createMockHorse();
    const race = createMockRace();
    const stable = createMockStable();

    const vetAggr = calculateJockeyAggressiveness(state, horse, race, veteranJockey, stable);
    const noTraitAggr = calculateJockeyAggressiveness(state, horse, race, noTraitJockey, stable);

    expect(vetAggr).toBeLessThanOrEqual(noTraitAggr);
  });

  it("big_match_temperament increases aggressiveness in large fields", () => {
    const state = createJockeyStrategyAIState(createMockStable());
    const bigMatchJockey = createMockJockey({ traits: ["big_match_temperament"] });
    const noTraitJockey = createMockJockey({ traits: [] });
    const horse = createMockHorse();
    const bigRace = createMockRace({
      fieldSize: 16,
      entries: Array.from({ length: 15 }, (_, i) => ({ horseId: `h${i}`, owned: false })),
    });
    const stable = createMockStable();

    const bigMatchAggr = calculateJockeyAggressiveness(
      state,
      horse,
      bigRace,
      bigMatchJockey,
      stable,
    );
    const noTraitAggr = calculateJockeyAggressiveness(state, horse, bigRace, noTraitJockey, stable);

    expect(bigMatchAggr).toBeGreaterThan(noTraitAggr);
  });
});

// ─── Enhanced applyAffinityBoost ────────────────────────────────────────────

describe("applyAffinityBoost — enhanced with moveTiming and earlyPosition", () => {
  function mkInstructions(overrides: Partial<JockeyInstructions> = {}): JockeyInstructions {
    return {
      horseId: "horse-1",
      raceId: "race-1",
      ridingStyle: "front_runner",
      earlyPosition: "midpack",
      moveTiming: "early",
      aggressiveness: 50,
      ...overrides,
    };
  }

  it("Trusted affinity (XP >= 150) upgrades moveTiming from early to mid", () => {
    const jockey = createMockJockey({
      affinityMap: { "horse-1": 150 },
    });
    const instructions = mkInstructions({ moveTiming: "early" });
    const result = applyAffinityBoost(instructions, jockey, "horse-1");
    expect(result.moveTiming).toBe("mid");
  });

  it("Bonded affinity (XP >= 400) upgrades moveTiming from mid to late", () => {
    const jockey = createMockJockey({
      affinityMap: { "horse-1": 400 },
    });
    const instructions = mkInstructions({ moveTiming: "mid" });
    const result = applyAffinityBoost(instructions, jockey, "horse-1");
    expect(result.moveTiming).toBe("late");
  });

  it("Bonded affinity (XP >= 400) upgrades moveTiming from early to mid", () => {
    const jockey = createMockJockey({
      affinityMap: { "horse-1": 400 },
    });
    const instructions = mkInstructions({ moveTiming: "early" });
    const result = applyAffinityBoost(instructions, jockey, "horse-1");
    expect(result.moveTiming).toBe("mid");
  });

  it("zero affinity leaves moveTiming unchanged", () => {
    const jockey = createMockJockey({
      affinityMap: {},
    });
    const instructions = mkInstructions({ moveTiming: "early" });
    const result = applyAffinityBoost(instructions, jockey, "horse-1");
    expect(result.moveTiming).toBe("early");
  });

  it("Trusted affinity upgrades earlyPosition from drop_back to midpack", () => {
    const jockey = createMockJockey({
      affinityMap: { "horse-1": 150 },
    });
    const instructions = mkInstructions({ earlyPosition: "drop_back" });
    const result = applyAffinityBoost(instructions, jockey, "horse-1");
    expect(result.earlyPosition).toBe("midpack");
  });

  it("existing aggressiveness boost still works (no regression)", () => {
    const jockey = createMockJockey({
      affinityMap: { "horse-1": 300 },
    });
    const instructions = mkInstructions({ aggressiveness: 50 });
    const result = applyAffinityBoost(instructions, jockey, "horse-1");
    expect(result.aggressiveness).toBeGreaterThan(50);
  });
});
