/**
 * advanceDayHelpers.test.ts - Tests for advance-day helper functions.
 */
import { describe, it, expect } from "vitest";
import { calculatePlayerUpkeep } from "@/platform/time/advanceDayHelpers";
import { UPKEEP_PER_HORSE } from "@/domains/market/model/economicConstants";
import { createTestHorse, createUnownedHorse } from "@/tests/helpers";
import { h2r } from "@/tests/helpers/sampleGameState";
import { asNpcStableId } from "@/shared/types/branded";
import { makeNpcOwned, makePlayerOwned } from "@/domains/horse/simulation/ownership";

describe("calculatePlayerUpkeep", () => {
  it("counts only player-owned horses regardless of lifecycle status", () => {
    const horses = h2r([
      createTestHorse({ id: "p1", ownership: makePlayerOwned() }),
      createTestHorse({ id: "p2", ownership: makePlayerOwned(), lifecycleStatus: "retired" }),
      createTestHorse({
        id: "n1",
        ownership: makeNpcOwned(asNpcStableId("npc-stable-1")),
      }),
      createUnownedHorse({ id: "u1" }),
    ]);
    expect(calculatePlayerUpkeep(horses)).toBe(2 * UPKEEP_PER_HORSE);
  });

  it("returns 0 for an empty record", () => {
    expect(calculatePlayerUpkeep({})).toBe(0);
  });

  it("returns 0 when only NPC-owned and unowned horses exist", () => {
    const horses = h2r([
      createTestHorse({
        id: "n1",
        ownership: makeNpcOwned(asNpcStableId("npc-stable-1")),
      }),
      createUnownedHorse({ id: "u1" }),
    ]);
    expect(calculatePlayerUpkeep(horses)).toBe(0);
  });
});
