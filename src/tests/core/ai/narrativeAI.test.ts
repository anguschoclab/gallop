/**
 * Tests for narrativeAI - AI-driven narrative arc system
 * Tests story arc generation, beat creation, dramatic potential tracking,
 * and narrative state management for NPC stables
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createNarrativeState,
  evaluateNarrativeOpportunity,
  generateStoryArc,
  generateStoryBeat,
  processNarrativeCycle,
  getActiveArcs,
  resolveArc,
  detectRaceBeats,
  detectDynastyBeats,
  detectComebackBeats,
  detectAllianceDramaBeats,
} from "@/core/ai/narrativeAI";
import type { Stable, GameState, Horse } from "@/game/types";
import type { Race } from "@/core/race/types";
import type {
  NpcAIManager,
  StableAIState,
  NarrativeArc,
  NarrativeState,
} from "@/core/ai/npcCycleAI";
import { createTestStable, createTestHorse } from "@/tests/helpers";

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "stable-1",
    name: "Test Stable",
    cash: 100000,
    personality: "aggressive",
    ...overrides,
  });
}

function createMockAIState(stableId: string): StableAIState {
  return {
    stableId,
    personalityState: {
      personality: "aggressive",
      conservatism: 0.3,
      innovation: 0.7,
      learningRate: 0.7,
      memoryDepth: 30,
      adaptationSpeed: 0.8,
      strategicHorizon: 7,
      competitiveAwareness: 0.6,
      strategyConfidence: 0.5,
    } as any,
    learningState: { outcomes: [], adaptations: {} } as any,
    lastUpdateDay: 1,
    friction: 0,
    winsAgainstPlayer: 0,
    regionalPrestige: {},
  } as any;
}

function createMockManager(stableIds: string[] = ["s1", "s2"]): NpcAIManager {
  const stableStates: Record<string, StableAIState> = {};
  for (const id of stableIds) {
    stableStates[id] = createMockAIState(id);
  }
  return { stableStates, globalDay: 100, regionalKings: {} };
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
    entries: [],
    resolved: true,
    result: [{ horseId: "horse-1", position: 1, time: 95.0 }],
    ...overrides,
  };
}

describe("createNarrativeState", () => {
  it("returns a NarrativeState with empty arcs and beats", () => {
    const state = createNarrativeState();
    expect(state.activeArcs).toEqual([]);
    expect(state.storyBeats).toEqual([]);
    expect(state.dramaticPotential).toBe(0);
  });
});

describe("evaluateNarrativeOpportunity", () => {
  it("returns null when dramatic potential is too low", () => {
    const stable = createMockStable();
    const narrativeState = createNarrativeState();
    const result = evaluateNarrativeOpportunity(stable, narrativeState, 100);
    expect(result).toBeNull();
  });

  it("returns arc type when dramatic potential is high enough", () => {
    const stable = createMockStable({ personality: "aggressive" });
    const narrativeState: NarrativeState = {
      activeArcs: [],
      storyBeats: [],
      dramaticPotential: 0.8,
    };
    const result = evaluateNarrativeOpportunity(stable, narrativeState, 100);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });

  it("returns null when stable already has max active arcs", () => {
    const stable = createMockStable();
    const narrativeState: NarrativeState = {
      activeArcs: [
        {
          id: "arc-1",
          type: "rivalry",
          stableId: stable.id,
          startDay: 50,
          status: "setup",
          beats: [],
        },
        {
          id: "arc-2",
          type: "underdog",
          stableId: stable.id,
          startDay: 60,
          status: "rising_action",
          beats: [],
        },
      ],
      storyBeats: [],
      dramaticPotential: 0.9,
    };
    const result = evaluateNarrativeOpportunity(stable, narrativeState, 100);
    expect(result).toBeNull();
  });
});

describe("generateStoryArc", () => {
  it("creates a NarrativeArc with correct stableId and startDay", () => {
    const stable = createMockStable({ id: "s1" });
    const arc = generateStoryArc(stable, "rivalry", 100);
    expect(arc.stableId).toBe("s1");
    expect(arc.startDay).toBe(100);
    expect(arc.type).toBe("rivalry");
    expect(arc.status).toBe("setup");
    expect(arc.beats).toEqual([]);
  });

  it("generates a unique arc ID", () => {
    const stable = createMockStable();
    const arc1 = generateStoryArc(stable, "rivalry", 100);
    const arc2 = generateStoryArc(stable, "underdog", 100);
    expect(arc1.id).not.toBe(arc2.id);
  });
});

describe("generateStoryBeat", () => {
  it("creates a StoryBeat with headline and body", () => {
    const beat = generateStoryBeat("arc-1", 100, "Test Headline", "Test body text");
    expect(beat.arcId).toBe("arc-1");
    expect(beat.day).toBe(100);
    expect(beat.headline).toBe("Test Headline");
    expect(beat.body).toBe("Test body text");
  });
});

describe("processNarrativeCycle", () => {
  it("initializes narrativeState for stables that don't have it", () => {
    const manager = createMockManager();
    const stables = [createMockStable({ id: "s1" })];
    const result = processNarrativeCycle(manager, stables, 100);
    expect(result.stableStates["s1"].narrativeState).toBeDefined();
    expect(result.stableStates["s1"].narrativeState!.activeArcs).toEqual([]);
    expect(result.stableStates["s1"].narrativeState!.dramaticPotential).toBe(0);
  });

  it("increases dramaticPotential over time", () => {
    const manager = createMockManager(["s1"]);
    manager.stableStates["s1"].narrativeState = createNarrativeState();
    const stables = [createMockStable({ id: "s1" })];
    const result = processNarrativeCycle(manager, stables, 100);
    expect(result.stableStates["s1"].narrativeState!.dramaticPotential).toBeGreaterThan(0);
  });

  it("generates a new arc when dramaticPotential is high enough", () => {
    const manager = createMockManager(["s1"]);
    manager.stableStates["s1"].narrativeState = {
      activeArcs: [],
      storyBeats: [],
      dramaticPotential: 0.85,
    };
    const stables = [createMockStable({ id: "s1", personality: "aggressive" })];
    const result = processNarrativeCycle(manager, stables, 100);
    expect(result.stableStates["s1"].narrativeState!.activeArcs.length).toBeGreaterThan(0);
  });

  it("advances arc status from setup to rising_action after enough days", () => {
    const manager = createMockManager(["s1"]);
    const arc: NarrativeArc = {
      id: "arc-1",
      type: "rivalry",
      stableId: "s1",
      startDay: 50,
      status: "setup",
      beats: [],
    };
    manager.stableStates["s1"].narrativeState = {
      activeArcs: [arc],
      storyBeats: [],
      dramaticPotential: 0.5,
    };
    const stables = [createMockStable({ id: "s1" })];
    const result = processNarrativeCycle(manager, stables, 100);
    const updatedArc = result.stableStates["s1"].narrativeState!.activeArcs[0];
    expect(updatedArc.status).not.toBe("setup");
  });
});

describe("getActiveArcs", () => {
  it("returns empty array when no narrativeState exists", () => {
    const manager = createMockManager(["s1"]);
    const result = getActiveArcs(manager, "s1");
    expect(result).toEqual([]);
  });

  it("returns active arcs for a stable", () => {
    const manager = createMockManager(["s1"]);
    const arc: NarrativeArc = {
      id: "arc-1",
      type: "rivalry",
      stableId: "s1",
      startDay: 50,
      status: "setup",
      beats: [],
    };
    manager.stableStates["s1"].narrativeState = {
      activeArcs: [arc],
      storyBeats: [],
      dramaticPotential: 0.5,
    };
    const result = getActiveArcs(manager, "s1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("arc-1");
  });
});

describe("resolveArc", () => {
  it("sets arc status to resolution", () => {
    const manager = createMockManager(["s1"]);
    const arc: NarrativeArc = {
      id: "arc-1",
      type: "rivalry",
      stableId: "s1",
      startDay: 50,
      status: "climax",
      beats: [],
    };
    manager.stableStates["s1"].narrativeState = {
      activeArcs: [arc],
      storyBeats: [],
      dramaticPotential: 0.5,
    };
    const result = resolveArc(
      manager,
      "s1",
      "arc-1",
      100,
      "Resolution headline",
      "Resolution body",
    );
    const resolvedArc = result.stableStates["s1"].narrativeState!.activeArcs[0];
    expect(resolvedArc.status).toBe("resolution");
  });

  it("adds a story beat for the resolution", () => {
    const manager = createMockManager(["s1"]);
    const arc: NarrativeArc = {
      id: "arc-1",
      type: "rivalry",
      stableId: "s1",
      startDay: 50,
      status: "climax",
      beats: [],
    };
    manager.stableStates["s1"].narrativeState = {
      activeArcs: [arc],
      storyBeats: [],
      dramaticPotential: 0.5,
    };
    const result = resolveArc(
      manager,
      "s1",
      "arc-1",
      100,
      "Resolution headline",
      "Resolution body",
    );
    expect(result.stableStates["s1"].narrativeState!.storyBeats).toHaveLength(1);
    expect(result.stableStates["s1"].narrativeState!.storyBeats[0].headline).toBe(
      "Resolution headline",
    );
  });
});

describe("detectRaceBeats", () => {
  function createManagerWithNarrative(stableId: string): NpcAIManager {
    return {
      stableStates: {
        [stableId]: {
          ...createMockAIState(stableId),
          narrativeState: createNarrativeState(),
        },
      },
      globalDay: 100,
      regionalKings: {},
    };
  }

  function createMockHorse(overrides: Partial<Horse> = {}): Horse {
    return createTestHorse({
      id: "horse-1",
      name: "Test Horse",
      stableId: "s1",
      stats: {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      raceHistory: [],
      ...overrides,
    });
  }

  it("generates a beat for G1 wins by NPC-owned horses", () => {
    const manager = createManagerWithNarrative("s1");
    const horse = createMockHorse({ id: "horse-1", stableId: "s1" });
    const race = createMockRace({
      graded: { key: "g1-test", grade: "G1", track: "Test", surface: "Dirt" },
    });
    const horseMap = new Map([["horse-1", horse]]);

    const result = detectRaceBeats(manager, [race], horseMap, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats.length).toBeGreaterThan(0);
    expect(beats.some((b) => b.headline.includes("Triumphs"))).toBe(true);
  });

  it("generates an upset beat when low-rated horse beats high-rated field", () => {
    const manager = createManagerWithNarrative("s1");
    const winner = createMockHorse({
      id: "winner",
      stableId: "s1",
      stats: {
        speed: 40,
        stamina: 40,
        acceleration: 40,
        consistency: 40,
        temperament: 30,
        conformation: 30,
      },
    });
    const strong1 = createMockHorse({
      id: "strong1",
      stableId: "player",
      stats: {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 70,
        conformation: 70,
      },
    });
    const strong2 = createMockHorse({
      id: "strong2",
      stableId: "player",
      stats: {
        speed: 75,
        stamina: 75,
        acceleration: 75,
        consistency: 75,
        temperament: 60,
        conformation: 60,
      },
    });
    const strong3 = createMockHorse({
      id: "strong3",
      stableId: "player",
      stats: {
        speed: 78,
        stamina: 78,
        acceleration: 78,
        consistency: 78,
        temperament: 65,
        conformation: 65,
      },
    });
    const race = createMockRace({
      result: [
        { horseId: "winner", position: 1, time: 95.0 },
        { horseId: "strong1", position: 2, time: 96.0 },
        { horseId: "strong2", position: 3, time: 97.0 },
        { horseId: "strong3", position: 4, time: 98.0 },
      ],
    });
    const horseMap = new Map([
      ["winner", winner],
      ["strong1", strong1],
      ["strong2", strong2],
      ["strong3", strong3],
    ]);

    const result = detectRaceBeats(manager, [race], horseMap, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats.some((b) => b.headline.includes("Shock Result"))).toBe(true);
  });

  it("does not generate beats for player-owned horses", () => {
    const manager = createManagerWithNarrative("s1");
    const horse = createMockHorse({ id: "horse-1", stableId: undefined });
    const race = createMockRace({
      graded: { key: "g1-test", grade: "G1", track: "Test", surface: "Dirt" },
    });
    const horseMap = new Map([["horse-1", horse]]);

    const result = detectRaceBeats(manager, [race], horseMap, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats).toHaveLength(0);
  });

  it("does not generate beats for races with no results", () => {
    const manager = createManagerWithNarrative("s1");
    const horse = createMockHorse({ id: "horse-1", stableId: "s1" });
    const race = createMockRace({ result: undefined });
    const horseMap = new Map([["horse-1", horse]]);

    const result = detectRaceBeats(manager, [race], horseMap, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats).toHaveLength(0);
  });
});

describe("detectDynastyBeats", () => {
  function createManagerWithNarrative(stableId: string): NpcAIManager {
    return {
      stableStates: {
        [stableId]: {
          ...createMockAIState(stableId),
          narrativeState: createNarrativeState(),
        },
      },
      globalDay: 100,
      regionalKings: {},
    };
  }

  it("generates dynasty beat when stable has 3+ homebred graded winners", () => {
    const manager = createManagerWithNarrative("s1");
    const winner = createTestHorse({
      id: "winner",
      stableId: "s1",
      sireId: "sire-1",
      damId: "dam-1",
      raceHistory: [
        { raceId: "r1", raceName: "Race 1", position: 1, day: 90, grade: "G1", stableId: "s1" },
      ],
    });
    const race = createMockRace({
      id: "race-1",
      graded: { key: "g1-test", grade: "G1", track: "Test", surface: "Dirt" },
      result: [{ horseId: "winner", position: 1, time: 95.0 }],
    });

    // Create 2 more homebred graded winners to reach threshold of 3
    const h2 = createTestHorse({
      id: "h2",
      stableId: "s1",
      sireId: "sire-2",
      damId: "dam-2",
      raceHistory: [
        { raceId: "r2", raceName: "Race 2", position: 1, day: 80, grade: "G2", stableId: "s1" },
      ],
    });
    const h3 = createTestHorse({
      id: "h3",
      stableId: "s1",
      sireId: "sire-3",
      damId: "dam-3",
      raceHistory: [
        { raceId: "r3", raceName: "Race 3", position: 1, day: 70, grade: "G1", stableId: "s1" },
      ],
    });

    const horseMap = new Map([
      ["winner", winner],
      ["h2", h2],
      ["h3", h3],
    ]);

    const result = detectDynastyBeats(manager, [race], horseMap, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats.some((b) => b.arcId === "dynasty")).toBe(true);
  });

  it("does not generate dynasty beat for non-graded races", () => {
    const manager = createManagerWithNarrative("s1");
    const horse = createTestHorse({
      id: "horse-1",
      stableId: "s1",
      sireId: "sire-1",
      damId: "dam-1",
    });
    const race = createMockRace({ graded: undefined });
    const horseMap = new Map([["horse-1", horse]]);

    const result = detectDynastyBeats(manager, [race], horseMap, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats).toHaveLength(0);
  });
});

describe("detectComebackBeats", () => {
  function createManagerWithNarrative(stableId: string): NpcAIManager {
    return {
      stableStates: {
        [stableId]: {
          ...createMockAIState(stableId),
          narrativeState: createNarrativeState(),
        },
      },
      globalDay: 100,
      regionalKings: {},
    };
  }

  it("generates comeback beat for older horse winning after long gap", () => {
    const manager = createManagerWithNarrative("s1");
    const horse = createTestHorse({
      id: "horse-1",
      stableId: "s1",
      age: 8,
      raceHistory: [
        { raceId: "r1", raceName: "Old Race", position: 3, day: 20, stableId: "s1" },
        { raceId: "r2", raceName: "Recent Win", position: 1, day: 100, stableId: "s1" },
      ],
    });
    const race = createMockRace({
      result: [{ horseId: "horse-1", position: 1, time: 95.0 }],
    });
    const horseMap = new Map([["horse-1", horse]]);

    const result = detectComebackBeats(manager, [race], horseMap, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats.some((b) => b.arcId === "comeback")).toBe(true);
  });

  it("does not generate comeback beat for young horse", () => {
    const manager = createManagerWithNarrative("s1");
    const horse = createTestHorse({
      id: "horse-1",
      stableId: "s1",
      age: 4,
      raceHistory: [
        { raceId: "r1", raceName: "Old Race", position: 3, day: 20, stableId: "s1" },
        { raceId: "r2", raceName: "Recent Win", position: 1, day: 100, stableId: "s1" },
      ],
    });
    const race = createMockRace({
      result: [{ horseId: "horse-1", position: 1, time: 95.0 }],
    });
    const horseMap = new Map([["horse-1", horse]]);

    const result = detectComebackBeats(manager, [race], horseMap, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats).toHaveLength(0);
  });
});

describe("detectAllianceDramaBeats", () => {
  it("generates betrayal beat when trust drops below -50", () => {
    const manager: NpcAIManager = {
      stableStates: {
        s1: {
          ...createMockAIState("s1"),
          npcRelationships: {
            s2: { trust: -60, allianceType: null, history: [] },
          },
          narrativeState: createNarrativeState(),
        },
      },
      globalDay: 100,
      regionalKings: {},
    };

    const result = detectAllianceDramaBeats(manager, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats.some((b) => b.arcId === "betrayal")).toBe(true);
  });

  it("generates alliance formed beat when trust is high with active alliance", () => {
    const manager: NpcAIManager = {
      stableStates: {
        s1: {
          ...createMockAIState("s1"),
          npcRelationships: {
            s2: { trust: 85, allianceType: "racing_coalition", history: [] },
          },
          narrativeState: createNarrativeState(),
        },
      },
      globalDay: 100,
      regionalKings: {},
    };

    const result = detectAllianceDramaBeats(manager, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats.some((b) => b.arcId === "alliance_formed")).toBe(true);
  });

  it("does not generate duplicate beats within 30 days", () => {
    const manager: NpcAIManager = {
      stableStates: {
        s1: {
          ...createMockAIState("s1"),
          npcRelationships: {
            s2: { trust: -60, allianceType: null, history: [] },
          },
          narrativeState: {
            activeArcs: [],
            storyBeats: [
              {
                arcId: "betrayal",
                day: 85,
                headline: "Alliance Broken: s1 Turns on s2",
                body: "Old beat",
              },
            ],
            dramaticPotential: 0,
          },
        },
      },
      globalDay: 100,
      regionalKings: {},
    };

    const result = detectAllianceDramaBeats(manager, 100);
    const beats = result.stableStates["s1"].narrativeState!.storyBeats;
    expect(beats).toHaveLength(1); // Only the pre-existing beat
  });
});
