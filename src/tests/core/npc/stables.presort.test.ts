import { describe, it, expect } from "vitest";
import { generateAllStables } from "@/core/npc/stables";
import { createRng, hashStr } from "@/core/common/rng";
import type { Stable } from "@/game/types";

describe("generateAllStables — elite pre-sort", () => {
  it("elite stables are sorted by reputation descending", () => {
    const stables = generateAllStables(1, createRng(hashStr("test_elite_presort")));

    const elite = stables.filter((s) => s.tier === "elite");
    expect(elite.length).toBeGreaterThan(1);

    for (let i = 1; i < elite.length; i++) {
      expect(elite[i - 1].reputation).toBeGreaterThanOrEqual(elite[i].reputation);
    }
  });

  it("elite stables remain grouped at the front (before any mid/budget)", () => {
    const stables = generateAllStables(1, createRng(hashStr("test_tier_grouping")));

    const firstNonElite = stables.findIndex((s) => s.tier !== "elite");
    // Every stable before the first non-elite must be elite.
    for (let i = 0; i < firstNonElite; i++) {
      expect(stables[i].tier).toBe("elite");
    }
    // Every stable from the first non-elite onward must NOT be elite.
    for (let i = firstNonElite; i < stables.length; i++) {
      expect(stables[i].tier).not.toBe("elite");
    }
  });

  it("is deterministic for a given seed (elite order stable across calls)", () => {
    const seed = "test_elite_determinism";
    const a = generateAllStables(1, createRng(hashStr(seed)));
    const b = generateAllStables(1, createRng(hashStr(seed)));

    const eliteA = a.filter((s) => s.tier === "elite");
    const eliteB = b.filter((s) => s.tier === "elite");
    expect(eliteA.map((s: Stable) => s.id)).toEqual(eliteB.map((s: Stable) => s.id));
    expect(eliteA.map((s: Stable) => s.reputation)).toEqual(
      eliteB.map((s: Stable) => s.reputation),
    );
  });
});
