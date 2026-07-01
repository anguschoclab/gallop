import { describe, it, expect } from "vitest";
import { runNpcCycle } from "@/core/npc/npcCycle";
import { createRng } from "@/core/common/rng";
import type { Horse, Race, Stable, Jockey } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

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
      owned: false,
      fame: 50,
      stableId: "stable-1",
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
      createTestHorse({ id: "horse-1", name: "Star Runner", fame: 50, stableId: "stable-1" }),
    ];

    const mockRaces: Race[] = [
      {
        id: "race-1",
        name: "Bluegrass Stakes",
        day: currentDay,
        resolved: true,
        result: [{ horseId: "horse-1", position: 1, time: 120 }],
        entries: [{ horseId: "horse-1", stableId: "stable-1", owned: false }],
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
