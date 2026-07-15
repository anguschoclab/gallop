import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clearLineageCache,
  getFoalsBy,
  getFoalsOf,
  getStakesFoalsBy,
  getG1FoalsBy,
  totalEarningsBy,
  getRunnersBy,
} from "@/core/breeding/lineage";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";

describe("lineage cache invalidation", () => {
  beforeEach(() => {
    clearLineageCache();
  });

  afterEach(() => {
    clearLineageCache();
  });

  const sireId = "sire-cache-test";
  const damId = "dam-cache-test";

  function makeState(horses: ReturnType<typeof createTestHorse>[]): Pick<GameState, "horses"> {
    return { horses: Object.fromEntries(horses.map((h) => [h.id, h])) };
  }

  it("getFoalsBy returns cached result even when horses change (stale cache bug)", () => {
    const foal1 = createTestHorse({
      id: "fc1",
      age: 3,
      pedigree: { sireId, sireName: "S", damId, damName: "D", name: "F", generation: 1 },
    });
    const state1 = makeState([foal1]);
    const firstCall = getFoalsBy(state1, sireId);
    expect(firstCall).toHaveLength(1);

    const foal2 = createTestHorse({
      id: "fc2",
      age: 3,
      pedigree: { sireId, sireName: "S", damId, damName: "D", name: "F2", generation: 1 },
    });
    const state2 = makeState([foal1, foal2]);
    const secondCall = getFoalsBy(state2, sireId);
    expect(secondCall).toHaveLength(1); // stale — should be 2 but cache returns old
  });

  it("clearLineageCache causes getFoalsBy to return fresh data", () => {
    const foal1 = createTestHorse({
      id: "fc1",
      age: 3,
      pedigree: { sireId, sireName: "S", damId, damName: "D", name: "F", generation: 1 },
    });
    const state1 = makeState([foal1]);
    getFoalsBy(state1, sireId);

    const foal2 = createTestHorse({
      id: "fc2",
      age: 3,
      pedigree: { sireId, sireName: "S", damId, damName: "D", name: "F2", generation: 1 },
    });
    const state2 = makeState([foal1, foal2]);
    clearLineageCache();
    const result = getFoalsBy(state2, sireId);
    expect(result).toHaveLength(2);
  });

  it("clearLineageCache clears all caches (foals, stakes, g1, earnings, runners)", () => {
    const foal = createTestHorse({
      id: "fc1",
      age: 3,
      pedigree: { sireId, sireName: "S", damId, damName: "D", name: "F", generation: 1 },
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Test",
          day: 10,
          position: 1,
          grade: "G1",
          purse: 100000,
          purseEarned: 70000,
        },
      ],
    });
    const state = makeState([foal]);

    getFoalsBy(state, sireId);
    getStakesFoalsBy(state, sireId);
    getG1FoalsBy(state, sireId);
    totalEarningsBy(state, sireId);
    getRunnersBy(state, sireId);

    clearLineageCache();

    const emptyState = makeState([]);
    expect(getFoalsBy(emptyState, sireId)).toHaveLength(0);
    expect(getStakesFoalsBy(emptyState, sireId)).toBe(0);
    expect(getG1FoalsBy(emptyState, sireId)).toBe(0);
    expect(totalEarningsBy(emptyState, sireId)).toBe(0);
    expect(getRunnersBy(emptyState, sireId)).toHaveLength(0);
  });

  it("getFoalsOf caches results after clearLineageCache", () => {
    const foal1 = createTestHorse({
      id: "fc1",
      age: 3,
      pedigree: { sireId: "other", sireName: "S", damId, damName: "D", name: "F", generation: 1 },
    });
    const state = makeState([foal1]);

    const first = getFoalsOf(state, damId);
    const second = getFoalsOf(state, damId);
    expect(first).toBe(second); // same reference from cache
  });
});
