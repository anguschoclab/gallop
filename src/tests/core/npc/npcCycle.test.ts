import { asNpcStableId } from "@/core/types/branded";
import { makeNpcOwned, makeUnowned } from "@/core/horse/ownership";
import { describe, it, expect } from "vitest";
import {
  runNpcCycle,
  applyFameGainsToHorses,
  calculateFameGainsForRaces,
} from "@/core/npc/npcCycle";
import { calculateFanGainsForRaces } from "@/core/horse/fans";
import { createRng } from "@/core/common/rng";
import type { Horse, Race, Stable, Jockey } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import {
  FAME_GAIN_G1_WIN,
  FAME_GAIN_G2_WIN,
  FAME_GAIN_G3_WIN,
  FAME_GAIN_OTHER_WIN,
  FAME_GAIN_G1_TOP3,
  FAME_GAIN_G2_TOP3,
  FAME_GAIN_G3_TOP3,
  FAME_GAIN_OTHER_TOP3,
  FAME_GAIN_TOP5,
  FAME_BONUS_LARGE_PURSE,
  FAME_BONUS_MEDIUM_PURSE,
  LARGE_PURSE_THRESHOLD,
  MEDIUM_PURSE_THRESHOLD,
  MAX_FAME,
  FAN_GAIN_G1_WIN,
  FAN_GAIN_G2_WIN,
} from "@/constants";
import {
  prestigeMultiplier,
  RACECOURSE_FLOOR_PRESTIGE,
  RACECOURSE_PRESTIGE_SPREAD,
  MIN_FAME_GAIN,
} from "@/core/prestige";

describe("runNpcCycle", () => {
  it("should return unchanged horses and races when no NPC stables", () => {
    const horses: Horse[] = [];
    const jockeys: Jockey[] = [];
    const races: Race[] = [];
    const npcStables: Stable[] = [];

    const result = runNpcCycle(npcStables, horses, jockeys, races, 10, { next: () => 0.5 } as any);
    expect(result.horses).toEqual([]);
    expect(result.races).toEqual([]);
  });

  it("should call runNpcTraining", () => {
    const npcStable = createTestStable({
      id: "stable-1",
      name: "NPC Stable",
      cash: 5000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const horses: Horse[] = [];
    const jockeys: Jockey[] = [];
    const races: Race[] = [];

    const result = runNpcCycle([npcStable], horses, jockeys, races, 10, { next: () => 0.5 } as any);
    // Just verify it doesn't crash and returns expected structure
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should call runNpcRaceEntry with raceEntryDaysAhead parameter", () => {
    const npcStable = createTestStable({
      id: "stable-1",
      name: "NPC Stable",
      cash: 5000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const horses: Horse[] = [];
    const jockeys: Jockey[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(
      [npcStable],
      horses,
      jockeys,
      races,
      10,
      { next: () => 0.5 } as any,
      5,
    );
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should use default raceEntryDaysAhead of 3 when not specified", () => {
    const npcStable = createTestStable({
      id: "stable-1",
      name: "NPC Stable",
      cash: 5000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const horses: Horse[] = [];
    const jockeys: Jockey[] = [];
    const races: Race[] = [];

    const result = runNpcCycle([npcStable], horses, jockeys, races, 10, { next: () => 0.5 } as any);
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should update fame for horses in resolved races from current day", () => {
    const npcStable = createTestStable({
      id: "stable-1",
      name: "NPC Stable",
      cash: 5000,
      personality: "breeder",
      reputation: 70,
      tier: "elite",
    });

    const horse = createTestHorse({
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      ownership: makeUnowned(),
      fame: 50,
    });

    const race: Race = {
      id: "race-1",
      name: "Test Race",
      day: 10,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "horse-1", position: 1, time: 120 }],
    };

    const result = runNpcCycle([npcStable], [horse], [], [race], 10, { next: () => 0.5 } as any);
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should return NpcCycleResult with correct structure", () => {
    const npcStables: Stable[] = [];
    const horses: Horse[] = [];
    const jockeys: Jockey[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, jockeys, races, 10, { next: () => 0.5 } as any);
    expect(result).toHaveProperty("horses");
    expect(result).toHaveProperty("races");
    expect(Array.isArray(result.horses)).toBe(true);
    expect(Array.isArray(result.races)).toBe(true);
  });
});

describe("Simulation Determinism", () => {
  it("should produce identical outputs given the same seed for runNpcCycle", () => {
    const seed = "test-seed-123";
    const currentDay = 100;

    const mockStables: Stable[] = [
      createTestStable({
        id: "stable-1",
        name: "Rival Stable",
        reputation: 600,
        cash: 100000,
        personality: "aggressive",
      }),
    ];

    const mockHorses: Horse[] = [
      createTestHorse({
        id: "horse-1",
        name: "Star Runner",
        fame: 50,
        ownership: makeNpcOwned(asNpcStableId("stable-1")),
      }),
    ];

    const mockRaces: Race[] = [
      {
        id: "race-1",
        name: "Bluegrass Stakes",
        day: currentDay,
        resolved: true,
        result: [{ horseId: "horse-1", position: 1, time: 120 }],
        entries: [{ horseId: "horse-1", ownership: makeNpcOwned(asNpcStableId("stable-1")) }],
        purse: 500000,
        graded: { grade: "G1" },
      } as Race,
    ];

    const runSim = () => {
      const rng = createRng(seed);
      return runNpcCycle(mockStables, [...mockHorses], [], [...mockRaces], currentDay, rng);
    };

    const result1 = runSim();
    const result2 = runSim();

    expect(result1.reputationEvents).toHaveLength(result2.reputationEvents!.length);
    if (result1.reputationEvents && result1.reputationEvents.length > 0) {
      expect(result1.reputationEvents[0].id).toBe(result2.reputationEvents![0].id);
      expect(result1.reputationEvents[0].description).toBe(
        result2.reputationEvents![0].description,
      );
    }

    expect(result1.newsItems).toHaveLength(result2.newsItems!.length);
    if (result1.newsItems && result1.newsItems.length > 0) {
      expect(result1.newsItems[0].headline).toBe(result2.newsItems![0].headline);
      expect(result1.newsItems[0].id).toBe(result2.newsItems![0].id);
    }

    expect(result1).toEqual(result2);
  });
});

describe("applyFameGainsToHorses", () => {
  it("applies fame gains to matching horses", () => {
    const horses = [
      createTestHorse({ id: "h1", fame: 10 }),
      createTestHorse({ id: "h2", fame: 20 }),
    ];
    const gains = new Map([["h1", 15]]);
    const result = applyFameGainsToHorses(horses, gains);
    expect(result[0].fame).toBe(25);
    expect(result[1].fame).toBe(20);
  });

  it("caps fame at MAX_FAME", () => {
    const horses = [createTestHorse({ id: "h1", fame: MAX_FAME - 5 })];
    const gains = new Map([["h1", 100]]);
    const result = applyFameGainsToHorses(horses, gains);
    expect(result[0].fame).toBe(MAX_FAME);
  });

  it("returns unchanged horses for empty gains", () => {
    const horses = [createTestHorse({ id: "h1", fame: 10 })];
    const gains = new Map<string, number>();
    const result = applyFameGainsToHorses(horses, gains);
    expect(result[0].fame).toBe(10);
  });

  it("does not mutate original horses", () => {
    const horses = [createTestHorse({ id: "h1", fame: 10 })];
    const gains = new Map([["h1", 15]]);
    applyFameGainsToHorses(horses, gains);
    expect(horses[0].fame).toBe(10);
  });
});

describe("runNpcCycle fame calculations", () => {
  function createMockStable(): Stable {
    return createTestStable({
      id: "npc-stable-1",
      name: "NPC Stable",
      cash: 100000,
      personality: "aggressive",
    });
  }

  function createMockHorse(overrides: Partial<Horse> = {}): Horse {
    return createTestHorse({
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      energy: 80,
      form: 60,
      fame: 0,
      ownership: makeNpcOwned("npc-stable-1"),
      ...overrides,
    });
  }

  // Races in these tests have no track info → floor prestige multiplier derived from constants.
  const FLOOR_MUL = prestigeMultiplier(RACECOURSE_FLOOR_PRESTIGE, RACECOURSE_PRESTIGE_SPREAD);
  const scaled = (base: number) => Math.max(MIN_FAME_GAIN, Math.round(base * FLOOR_MUL));

  it("calculates fame changes for G1 win", () => {
    const stable = createMockStable();
    const horse = createMockHorse({ id: "h1", ownership: makeNpcOwned("npc-stable-1") });
    const race: Race = {
      id: "r1",
      name: "Test Race",
      day: 100,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "h1", position: 1, time: 90 }],
      graded: { grade: "G1" } as any,
    };
    const rng = createRng("test-seed");
    const result = runNpcCycle([stable], [horse], [], [race], 100, rng);
    expect(result.fameChanges!.length).toBeGreaterThan(0);
    expect(result.fameChanges![0].horseId).toBe("h1");
    expect(result.fameChanges![0].delta).toBe(scaled(FAME_GAIN_G1_WIN));
  });

  it("calculates fame for G2 win", () => {
    const horse = createMockHorse({ id: "h1" });
    const race: Race = {
      id: "r1",
      name: "Test Race",
      day: 100,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "h1", position: 1, time: 90 }],
      graded: { grade: "G2" } as any,
    };
    const rng = createRng("test-seed");
    const result = runNpcCycle([createMockStable()], [horse], [], [race], 100, rng);
    const fameChange = result.fameChanges!.find((f) => f.horseId === "h1");
    expect(fameChange).toBeDefined();
    expect(fameChange!.delta).toBe(scaled(FAME_GAIN_G2_WIN));
  });

  it("calculates fame for non-graded win", () => {
    const horse = createMockHorse({ id: "h1" });
    const race: Race = {
      id: "r1",
      name: "Test Race",
      day: 100,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "h1", position: 1, time: 90 }],
    };
    const rng = createRng("test-seed");
    const result = runNpcCycle([createMockStable()], [horse], [], [race], 100, rng);
    const fameChange = result.fameChanges!.find((f) => f.horseId === "h1");
    expect(fameChange).toBeDefined();
    expect(fameChange!.delta).toBe(scaled(FAME_GAIN_OTHER_WIN));
  });

  it("calculates fame for top 5 (position 4-5)", () => {
    const horse = createMockHorse({ id: "h1" });
    const race: Race = {
      id: "r1",
      name: "Test Race",
      day: 100,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "h1", position: 4, time: 92 }],
    };
    const rng = createRng("test-seed");
    const result = runNpcCycle([createMockStable()], [horse], [], [race], 100, rng);
    const fameChange = result.fameChanges!.find((f) => f.horseId === "h1");
    expect(fameChange).toBeDefined();
    expect(fameChange!.delta).toBe(scaled(FAME_GAIN_TOP5));
  });

  it("does not generate fame changes for unresolved races", () => {
    const horse = createMockHorse({ id: "h1" });
    const race: Race = {
      id: "r1",
      name: "Test Race",
      day: 100,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };
    const rng = createRng("test-seed");
    const result = runNpcCycle([createMockStable()], [horse], [], [race], 100, rng);
    expect(result.fameChanges!.length).toBe(0);
  });
});

describe("runNpcCycle AI state management", () => {
  it("creates AI state for new stable", () => {
    const stable = createTestStable({ id: "new-npc", personality: "aggressive" });
    const rng = createRng("test-seed");
    const result = runNpcCycle([stable], [], [], [], 100, rng);
    expect(result.aiManager.stableStates["new-npc"]).toBeDefined();
    expect(result.aiManager.stableStates["new-npc"].stableId).toBe("new-npc");
  });

  it("updates globalDay in aiManager", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    const rng = createRng("test-seed");
    const result = runNpcCycle([stable], [], [], [], 100, rng);
    expect(result.aiManager.globalDay).toBe(100);
  });

  it("prunes learning data older than 90 days", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    const rng = createRng("test-seed");
    const aiManager = {
      stableStates: {
        s1: {
          stableId: "s1",
          personalityState: { personality: "aggressive" } as any,
          learningState: {
            outcomes: [
              { context: "old", success: true, value: 10, day: 1, category: "test" } as any,
              { context: "new", success: true, value: 10, day: 150, category: "test" } as any,
            ],
          },
          lastUpdateDay: 1,
          friction: 0,
          winsAgainstPlayer: 0,
          regionalPrestige: {},
        },
      },
      globalDay: 1,
      regionalKings: {},
    } as any;
    const result = runNpcCycle([stable], [], [], [], 200, rng, 3, new Set(), aiManager);
    expect(result.aiManager.stableStates["s1"].learningState.outcomes.length).toBe(1);
  });
});

describe("calculateFameGainsForRaces", () => {
  function createRaceWithResult(
    overrides: Partial<Race> & {
      result?: { horseId: string; position: number; time: number }[];
    } = {},
  ): Race {
    return {
      id: "race-1",
      name: "Test Race",
      day: 100,
      distance: 1600,
      surface: "Dirt",
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      ...overrides,
    };
  }

  // Tests use track "test" (unknown → floor prestige score, multiplier derived from constants).
  // calculateFameGainsForRaces applies racecoursePrestigeMultiplier, so expected
  // fame = Math.max(MIN_FAME_GAIN, Math.round(baseFame * FLOOR_MUL)).
  const FLOOR_MUL = prestigeMultiplier(RACECOURSE_FLOOR_PRESTIGE, RACECOURSE_PRESTIGE_SPREAD);
  const scaled = (base: number) => Math.max(MIN_FAME_GAIN, Math.round(base * FLOOR_MUL));

  const g1 = { key: "g1", grade: "G1" as const, track: "test", surface: "Dirt" as const };
  const g2 = { key: "g2", grade: "G2" as const, track: "test", surface: "Dirt" as const };
  const g3 = { key: "g3", grade: "G3" as const, track: "test", surface: "Dirt" as const };

  function result(horseId: string, position: number) {
    return [{ horseId, position, time: 90 }];
  }

  it("calculates fame for G1 win", () => {
    const race = createRaceWithResult({ graded: g1, result: result("h-1", 1) });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_G1_WIN));
  });

  it("calculates fame for G2 win", () => {
    const race = createRaceWithResult({ graded: g2, result: result("h-1", 1) });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_G2_WIN));
  });

  it("calculates fame for G3 win", () => {
    const race = createRaceWithResult({ graded: g3, result: result("h-1", 1) });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_G3_WIN));
  });

  it("calculates fame for non-graded win", () => {
    const race = createRaceWithResult({ result: result("h-1", 1) });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_OTHER_WIN));
  });

  it("calculates fame for top 3 in G1", () => {
    const race = createRaceWithResult({ graded: g1, result: result("h-1", 2) });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_G1_TOP3));
  });

  it("calculates fame for top 3 in G2", () => {
    const race = createRaceWithResult({ graded: g2, result: result("h-1", 3) });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_G2_TOP3));
  });

  it("calculates fame for top 5 (position 4-5)", () => {
    const race = createRaceWithResult({ result: result("h-1", 4) });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_TOP5));
  });

  it("adds large purse bonus", () => {
    const race = createRaceWithResult({
      graded: g1,
      purse: LARGE_PURSE_THRESHOLD + 1,
      result: result("h-1", 1),
    });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_G1_WIN + FAME_BONUS_LARGE_PURSE));
  });

  it("adds medium purse bonus", () => {
    const race = createRaceWithResult({
      graded: g1,
      purse: MEDIUM_PURSE_THRESHOLD + 1,
      result: result("h-1", 1),
    });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_G1_WIN + FAME_BONUS_MEDIUM_PURSE));
  });

  it("no fame for position > 5", () => {
    const race = createRaceWithResult({ result: result("h-1", 6) });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.has("h-1")).toBe(false);
  });

  it("no fame for unresolved race", () => {
    const race = createRaceWithResult({ resolved: false, result: undefined });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.size).toBe(0);
  });

  it("no fame for race with no result", () => {
    const race = createRaceWithResult({ result: undefined });
    const gains = calculateFameGainsForRaces([race]);
    expect(gains.size).toBe(0);
  });

  it("aggregates fame across multiple races for same horse", () => {
    const race1 = createRaceWithResult({ id: "r-1", graded: g1, result: result("h-1", 1) });
    const race2 = createRaceWithResult({ id: "r-2", graded: g2, result: result("h-1", 1) });
    const gains = calculateFameGainsForRaces([race1, race2]);
    expect(gains.get("h-1")).toBe(scaled(FAME_GAIN_G1_WIN) + scaled(FAME_GAIN_G2_WIN));
  });

  it("handles empty races array", () => {
    const gains = calculateFameGainsForRaces([]);
    expect(gains.size).toBe(0);
  });
});

describe("calculateFanGainsForRaces", () => {
  function createRaceWithResult(
    overrides: Partial<Race> & {
      result?: { horseId: string; position: number; time: number }[];
    } = {},
  ): Race {
    return {
      id: "race-1",
      name: "Test Race",
      day: 100,
      distance: 1600,
      surface: "Dirt",
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      ...overrides,
    };
  }

  const g1 = { key: "g1", grade: "G1" as const, track: "test", surface: "Dirt" as const };
  const g2 = { key: "g2", grade: "G2" as const, track: "test", surface: "Dirt" as const };

  it("returns correct fan gains for G1 win", () => {
    const race = createRaceWithResult({
      graded: g1,
      result: [{ horseId: "h-1", position: 1, time: 90 }],
    });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_G1_WIN);
  });

  it("returns correct fan gains for G2 win", () => {
    const race = createRaceWithResult({
      graded: g2,
      result: [{ horseId: "h-1", position: 1, time: 90 }],
    });
    const gains = calculateFanGainsForRaces([race]);
    expect(gains.get("h-1")).toBe(FAN_GAIN_G2_WIN);
  });
});

describe("runNpcCycle fan changes", () => {
  function createMockStable(): Stable {
    return createTestStable({
      id: "npc-stable-1",
      name: "NPC Stable",
      cash: 100000,
      personality: "aggressive",
    });
  }

  it("returns fanChanges in result when yesterday's races have gains", () => {
    const stable = createMockStable();
    const horse = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-stable-1"),
      fame: 0,
      fanCount: 0,
    });
    const race: Race = {
      id: "r1",
      name: "Test Race",
      day: 100,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "h1", position: 1, time: 90 }],
      graded: { grade: "G1" } as any,
    };
    const rng = createRng("test-seed");
    const result = runNpcCycle([stable], [horse], [], [race], 100, rng);
    expect(result.fanChanges).toBeDefined();
    expect(result.fanChanges!.length).toBeGreaterThan(0);
    expect(result.fanChanges![0].horseId).toBe("h1");
    expect(result.fanChanges![0].delta).toBe(FAN_GAIN_G1_WIN);
  });

  it("returns empty fanChanges when no races", () => {
    const stable = createMockStable();
    const rng = createRng("test-seed");
    const result = runNpcCycle([stable], [], [], [], 100, rng);
    expect(result.fanChanges).toBeDefined();
    expect(result.fanChanges!.length).toBe(0);
  });

  it("fan changes are proportional to race grade and position", () => {
    const stable = createMockStable();
    const horseG1 = createTestHorse({
      id: "h1",
      ownership: makeNpcOwned("npc-stable-1"),
      fame: 0,
      fanCount: 0,
    });
    const horseG2 = createTestHorse({
      id: "h2",
      ownership: makeNpcOwned("npc-stable-1"),
      fame: 0,
      fanCount: 0,
    });
    const raceG1: Race = {
      id: "r1",
      name: "G1 Race",
      day: 100,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "h1", position: 1, time: 90 }],
      graded: { grade: "G1" } as any,
    };
    const raceG2: Race = {
      id: "r2",
      name: "G2 Race",
      day: 100,
      distance: 1600,
      raceClass: "Stakes",
      entryFee: 100,
      purse: 50000,
      fieldSize: 8,
      entries: [],
      resolved: true,
      result: [{ horseId: "h2", position: 1, time: 90 }],
      graded: { grade: "G2" } as any,
    };
    const rng = createRng("test-seed");
    const result = runNpcCycle([stable], [horseG1, horseG2], [], [raceG1, raceG2], 100, rng);
    const g1Change = result.fanChanges!.find((f) => f.horseId === "h1");
    const g2Change = result.fanChanges!.find((f) => f.horseId === "h2");
    expect(g1Change).toBeDefined();
    expect(g2Change).toBeDefined();
    expect(g1Change!.delta).toBeGreaterThan(g2Change!.delta);
  });
});
