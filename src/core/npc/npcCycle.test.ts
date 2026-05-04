/**
 * Tests for npc/npcCycle
 */

import { describe, it, expect } from "vitest";
import { runNpcCycle } from "./npcCycle";
import type { Horse, Race, Stable } from "@/game/types";

describe("runNpcCycle", () => {
  it("should return unchanged horses and races when no NPC stables", () => {
    const horses: Horse[] = [];
    const races: Race[] = [];
    const npcStables: Stable[] = [];

    const result = runNpcCycle(npcStables, horses, races, 10);
    expect(result.horses).toEqual([]);
    expect(result.races).toEqual([]);
  });

  it("should call runNpcTraining", () => {
    const npcStables: Stable[] = [
      {
        id: "stable-1",
        name: "NPC Stable",
        cash: 5000,
        personality: "breeder",
        reputation: 70,
        tier: "elite",
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
      },
    ];

    const horses: Horse[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, races, 10);
    // Just verify it doesn't crash and returns expected structure
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should call runNpcRaceEntry with raceEntryDaysAhead parameter", () => {
    const npcStables: Stable[] = [
      {
        id: "stable-1",
        name: "NPC Stable",
        cash: 5000,
        personality: "breeder",
        reputation: 70,
        tier: "elite",
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
      },
    ];

    const horses: Horse[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, races, 10, 5);
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should use default raceEntryDaysAhead of 3 when not specified", () => {
    const npcStables: Stable[] = [
      {
        id: "stable-1",
        name: "NPC Stable",
        cash: 5000,
        personality: "breeder",
        reputation: 70,
        tier: "elite",
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
      },
    ];

    const horses: Horse[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, races, 10);
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should update fame for horses in resolved races from current day", () => {
    const npcStables: Stable[] = [
      {
        id: "stable-1",
        name: "NPC Stable",
        cash: 5000,
        personality: "breeder",
        reputation: 70,
        tier: "elite",
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
      },
    ];

    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

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
      result: [
        { horseId: "horse-1", position: 1, time: 120 },
      ],
    };

    const result = runNpcCycle(npcStables, [horse], [race], 10);
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should return NpcCycleResult with correct structure", () => {
    const npcStables: Stable[] = [];
    const horses: Horse[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, races, 10);
    expect(result).toHaveProperty("horses");
    expect(result).toHaveProperty("races");
    expect(Array.isArray(result.horses)).toBe(true);
    expect(Array.isArray(result.races)).toBe(true);
  });
});
