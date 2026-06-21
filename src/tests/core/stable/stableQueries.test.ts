import { describe, it, expect } from "vitest";
import {
  getStableById,
  getMajorStables,
  getStablesByTier,
  getStartingCashForTier,
  getTargetHorseCountForTier,
  mapStallionToStable,
} from "@/core/stable/stableQueries";
import { createTestStable } from "@/tests/helpers";
import { createRng } from "@/core/common/rng";
import type { Stable } from "@/game/types";
import type { PedigreeHorse } from "@/data/pedigreeData";

function makeStables(): Stable[] {
  return [
    createTestStable({ id: "s1", name: "Elite Stable", tier: "elite", isMajor: true }),
    createTestStable({ id: "s2", name: "Mid Stable", tier: "mid", isMajor: true }),
    createTestStable({ id: "s3", name: "Budget Stable", tier: "budget", isMajor: true }),
    createTestStable({ id: "s4", name: "Filler", tier: "budget", isMajor: false }),
  ];
}

function makeStallion(overrides: Partial<PedigreeHorse> = {}): PedigreeHorse {
  return {
    name: "Test Stallion",
    studFee: 50000,
    studFarm: "Test Farm",
    currentStatus: "active",
    ...overrides,
  };
}

describe("getStableById", () => {
  it("finds stable by ID", () => {
    const stables = makeStables();
    expect(getStableById(stables, "s1")?.name).toBe("Elite Stable");
  });

  it("returns undefined for non-existent ID", () => {
    const stables = makeStables();
    expect(getStableById(stables, "nonexistent")).toBeUndefined();
  });
});

describe("getMajorStables", () => {
  it("returns only major stables", () => {
    const stables = makeStables();
    const major = getMajorStables(stables);
    expect(major).toHaveLength(3);
    expect(major.every((s) => s.isMajor)).toBe(true);
  });
});

describe("getStablesByTier", () => {
  it("filters by tier correctly", () => {
    const stables = makeStables();
    expect(getStablesByTier(stables, "elite")).toHaveLength(1);
    expect(getStablesByTier(stables, "mid")).toHaveLength(1);
    expect(getStablesByTier(stables, "budget")).toHaveLength(2);
  });
});

describe("getStartingCashForTier", () => {
  it("returns appropriate cash for each tier", () => {
    const rng = createRng("test");
    expect(getStartingCashForTier("elite", rng)).toBeGreaterThanOrEqual(500000);
    expect(getStartingCashForTier("elite", rng)).toBeLessThanOrEqual(1000000);
    expect(getStartingCashForTier("mid", rng)).toBeGreaterThanOrEqual(150000);
    expect(getStartingCashForTier("mid", rng)).toBeLessThanOrEqual(350000);
    expect(getStartingCashForTier("budget", rng)).toBeGreaterThanOrEqual(20000);
    expect(getStartingCashForTier("budget", rng)).toBeLessThanOrEqual(70000);
  });
});

describe("getTargetHorseCountForTier", () => {
  it("returns 10 for filler stables", () => {
    const rng = createRng("test");
    expect(getTargetHorseCountForTier("elite", false, rng)).toBe(10);
  });

  it("returns appropriate count for major stables", () => {
    const rng = createRng("test");
    expect(getTargetHorseCountForTier("elite", true, rng)).toBeGreaterThanOrEqual(30);
    expect(getTargetHorseCountForTier("elite", true, rng)).toBeLessThanOrEqual(40);
  });
});

describe("mapStallionToStable", () => {
  it("matches by exact stud farm name first", () => {
    const stables = makeStables();
    const stallion = makeStallion({ studFarm: "Elite Stable" });
    const result = mapStallionToStable(stallion, stables);
    expect(result.id).toBe("s1");
  });

  it("falls back to tier-based selection by stud fee", () => {
    const stables = makeStables();
    const stallion = makeStallion({ studFarm: "Nonexistent Farm", studFee: 150000 });
    const result = mapStallionToStable(stallion, stables);
    expect(result.tier).toBe("elite");
  });

  it("uses provided rng for random selection", () => {
    const stables = makeStables();
    const stallion = makeStallion({ studFarm: "Nonexistent Farm", studFee: 150000 });
    const rng1 = createRng("seed-1");
    const rng2 = createRng("seed-2");
    const result1 = mapStallionToStable(stallion, stables, rng1);
    const result2 = mapStallionToStable(stallion, stables, rng2);
    // Both should be elite tier
    expect(result1.tier).toBe("elite");
    expect(result2.tier).toBe("elite");
  });

  it("falls back to nondeterministicRng when no rng provided", () => {
    const stables = makeStables();
    const stallion = makeStallion({ studFarm: "Nonexistent Farm", studFee: 50000 });
    const result = mapStallionToStable(stallion, stables);
    // Should return a mid-tier stable
    expect(result.tier).toBe("mid");
  });

  it("assigns budget tier for low stud fee", () => {
    const stables = makeStables();
    const stallion = makeStallion({ studFarm: "Nonexistent Farm", studFee: 10000 });
    const result = mapStallionToStable(stallion, stables);
    expect(result.tier).toBe("budget");
  });
});
