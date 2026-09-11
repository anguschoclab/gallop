/**
 * Tests for regional dominance helpers extracted from resolveRegionalDominance.
 */

import { describe, it, expect } from "vitest";
import {
  resolveWinningStableId,
  buildRaceEntryMaps,
  findBestResult,
} from "@/core/npc/regionalDominanceHelpers";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import type { Race } from "@/game/types";

describe("resolveWinningStableId", () => {
  it("returns 'player' for a player-owned horse", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned() });
    expect(resolveWinningStableId(horse)).toBe("player");
  });

  it("returns the stable ID for an NPC-owned horse", () => {
    const stableId = asNpcStableId("stable_1");
    const horse = createTestHorse({ id: "h1", ownership: makeNpcOwned(stableId) });
    expect(resolveWinningStableId(horse)).toBe("stable_1");
  });

  it("returns null for an unowned horse", () => {
    const horse = createTestHorse({ id: "h1", ownership: { type: "unowned" } });
    expect(resolveWinningStableId(horse)).toBeNull();
  });

  it("returns null for undefined horse", () => {
    expect(resolveWinningStableId(undefined)).toBeNull();
  });
});

describe("buildRaceEntryMaps", () => {
  it("separates player and NPC horse IDs by stable", () => {
    const race = {
      entries: [
        { horseId: "p1", ownership: makePlayerOwned(), weight: 126 },
        { horseId: "n1", ownership: makeNpcOwned(asNpcStableId("s1")), weight: 126 },
        { horseId: "n2", ownership: makeNpcOwned(asNpcStableId("s2")), weight: 126 },
        { horseId: "n3", ownership: makeNpcOwned(asNpcStableId("s1")), weight: 126 },
      ],
    } as unknown as Race;
    const { playerHorseIds, npcHorseIdsByStable } = buildRaceEntryMaps(race);
    expect(playerHorseIds).toEqual(new Set(["p1"]));
    expect(npcHorseIdsByStable.get("s1")).toEqual(new Set(["n1", "n3"]));
    expect(npcHorseIdsByStable.get("s2")).toEqual(new Set(["n2"]));
  });

  it("returns empty sets for a race with no entries", () => {
    const race = { entries: [] } as unknown as Race;
    const { playerHorseIds, npcHorseIdsByStable } = buildRaceEntryMaps(race);
    expect(playerHorseIds.size).toBe(0);
    expect(npcHorseIdsByStable.size).toBe(0);
  });
});

describe("findBestResult", () => {
  it("returns the horse with the lowest position number", () => {
    const race = {
      result: [
        { horseId: "h1", position: 3, time: 120 },
        { horseId: "h2", position: 1, time: 118 },
        { horseId: "h3", position: 2, time: 119 },
      ],
    } as unknown as Race;
    const horseIds = new Set(["h1", "h2", "h3"]);
    const best = findBestResult(race, horseIds);
    expect(best).toEqual({ horseId: "h2", position: 1 });
  });

  it("returns null when no results match the horse IDs", () => {
    const race = {
      result: [{ horseId: "h1", position: 1, time: 120 }],
    } as unknown as Race;
    const horseIds = new Set(["h_other"]);
    expect(findBestResult(race, horseIds)).toBeNull();
  });

  it("returns null when results are empty", () => {
    const race = { result: [] } as unknown as Race;
    const horseIds = new Set(["h1"]);
    expect(findBestResult(race, horseIds)).toBeNull();
  });
});
