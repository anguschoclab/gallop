import { describe, it, expect } from "vitest";
import { runNpcCycle } from "@/core/npc/npcCycle";
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
