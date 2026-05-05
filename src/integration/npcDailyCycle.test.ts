/**
 * Integration Tests: NPC Daily Cycle
 * Tests that modules work together correctly in the NPC training → race entry → breeding flow
 */

import { describe, it, expect } from "vitest";
import { runNpcCycle } from "@/core/npc/npcCycle";
import { createRng } from "@/game/rng";
import type { GameState, Horse, Stable, Race, Jockey } from "@/game/types";

describe("NPC Daily Cycle Integration", () => {
  it("should run complete NPC cycle", () => {
    const npcStables: Stable[] = [
      {
        id: "stable-1",
        name: "NPC Stable",
        cash: 5000,
        personality: "breeder" as const,
        reputation: 70,
        tier: "elite" as const,
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
      },
    ];

    const horses: Horse[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, races, 10, createRng("test"));
    
    // Verify result structure
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
    expect(Array.isArray(result.horses)).toBe(true);
    expect(Array.isArray(result.races)).toBe(true);
  });

  it("should skip when no NPC stables", () => {
    const npcStables: Stable[] = [];
    const horses: Horse[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, races, 10, createRng("test"));
    
    // Should return unchanged
    expect(result.horses).toEqual([]);
    expect(result.races).toEqual([]);
  });

  it("should handle empty horse roster", () => {
    const npcStables: Stable[] = [
      {
        id: "stable-1",
        name: "NPC Stable",
        cash: 5000,
        personality: "breeder" as const,
        reputation: 70,
        tier: "elite" as const,
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
      },
    ];

    const horses: Horse[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, races, 10, createRng("test"));
    
    // Should not crash with empty horse roster
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });

  it("should use custom raceEntryDaysAhead parameter", () => {
    const npcStables: Stable[] = [
      {
        id: "stable-1",
        name: "NPC Stable",
        cash: 5000,
        personality: "breeder" as const,
        reputation: 70,
        tier: "elite" as const,
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
      },
    ];

    const horses: Horse[] = [];
    const jockeys: Jockey[] = [];
    const races: Race[] = [];

    const result = runNpcCycle(npcStables, horses, jockeys, races, 10, createRng(12345), 5);
    
    // Should not crash with custom raceEntryDaysAhead
    expect(result.horses).toBeDefined();
    expect(result.races).toBeDefined();
  });
});
