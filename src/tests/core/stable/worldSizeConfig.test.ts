import { describe, it, expect } from "vitest";
import {
  WORLD_SIZE_CONFIGS,
  getWorldSizeConfig,
  getStableConfig,
  DEFAULT_WORLD_SIZE,
  type WorldSize,
} from "@/core/stable/worldSizeConfig";
import { STABLE_CONFIG } from "@/core/stable/stableConfig";

describe("WORLD_SIZE_CONFIGS", () => {
  it("has entries for small, medium, and large", () => {
    expect(WORLD_SIZE_CONFIGS.small).toBeDefined();
    expect(WORLD_SIZE_CONFIGS.medium).toBeDefined();
    expect(WORLD_SIZE_CONFIGS.large).toBeDefined();
  });

  it("each config has stables with elite/mid/budget/filler counts and reputation ranges", () => {
    for (const size of ["small", "medium", "large"] as WorldSize[]) {
      const config = WORLD_SIZE_CONFIGS[size];
      expect(config.stables.elite.count).toBeGreaterThan(0);
      expect(config.stables.elite.reputationRange).toHaveLength(2);
      expect(config.stables.mid.count).toBeGreaterThan(0);
      expect(config.stables.mid.reputationRange).toHaveLength(2);
      expect(config.stables.budget.count).toBeGreaterThan(0);
      expect(config.stables.budget.reputationRange).toHaveLength(2);
      expect(config.stables.filler.count).toBeGreaterThan(0);
    }
  });

  it("each config has horseCounts with per-tier min/max and filler count", () => {
    for (const size of ["small", "medium", "large"] as WorldSize[]) {
      const config = WORLD_SIZE_CONFIGS[size];
      expect(config.horseCounts.elite[0]).toBeLessThanOrEqual(config.horseCounts.elite[1]);
      expect(config.horseCounts.mid[0]).toBeLessThanOrEqual(config.horseCounts.mid[1]);
      expect(config.horseCounts.budget[0]).toBeLessThanOrEqual(config.horseCounts.budget[1]);
      expect(config.horseCounts.filler).toBeGreaterThan(0);
    }
  });

  it("each config has jockeyCount and freeAgentMin", () => {
    for (const size of ["small", "medium", "large"] as WorldSize[]) {
      const config = WORLD_SIZE_CONFIGS[size];
      expect(config.jockeyCount).toBeGreaterThan(0);
      expect(config.freeAgentMin).toBeGreaterThan(0);
    }
  });

  it("Small config has total stables >= 25 (minimum for race filling)", () => {
    const small = WORLD_SIZE_CONFIGS.small;
    const total =
      small.stables.elite.count +
      small.stables.mid.count +
      small.stables.budget.count +
      small.stables.filler.count;
    expect(total).toBeGreaterThanOrEqual(25);
  });

  it("Large config matches current STABLE_CONFIG values exactly", () => {
    const large = WORLD_SIZE_CONFIGS.large;
    expect(large.stables.elite.count).toBe(STABLE_CONFIG.elite.count);
    expect(large.stables.elite.reputationRange).toEqual(STABLE_CONFIG.elite.reputationRange);
    expect(large.stables.mid.count).toBe(STABLE_CONFIG.mid.count);
    expect(large.stables.mid.reputationRange).toEqual(STABLE_CONFIG.mid.reputationRange);
    expect(large.stables.budget.count).toBe(STABLE_CONFIG.budget.count);
    expect(large.stables.budget.reputationRange).toEqual(STABLE_CONFIG.budget.reputationRange);
    expect(large.stables.filler.count).toBe(STABLE_CONFIG.filler.count);
  });

  it("all elite/mid/budget counts are <= pool sizes (18/34/10)", () => {
    for (const size of ["small", "medium", "large"] as WorldSize[]) {
      const config = WORLD_SIZE_CONFIGS[size];
      expect(config.stables.elite.count).toBeLessThanOrEqual(18);
      expect(config.stables.mid.count).toBeLessThanOrEqual(34);
      expect(config.stables.budget.count).toBeLessThanOrEqual(10);
    }
  });

  it("Small has fewer entities than Medium, Medium fewer than Large", () => {
    const s = getWorldSizeConfig("small").stables;
    const m = getWorldSizeConfig("medium").stables;
    const l = getWorldSizeConfig("large").stables;
    const smallTotal = s.elite.count + s.mid.count + s.budget.count + s.filler.count;
    const mediumTotal = m.elite.count + m.mid.count + m.budget.count + m.filler.count;
    const largeTotal = l.elite.count + l.mid.count + l.budget.count + l.filler.count;
    expect(smallTotal).toBeLessThan(mediumTotal);
    expect(mediumTotal).toBeLessThan(largeTotal);
  });
});

describe("getWorldSizeConfig", () => {
  it("returns the correct config for each size", () => {
    expect(getWorldSizeConfig("small")).toBe(WORLD_SIZE_CONFIGS.small);
    expect(getWorldSizeConfig("medium")).toBe(WORLD_SIZE_CONFIGS.medium);
    expect(getWorldSizeConfig("large")).toBe(WORLD_SIZE_CONFIGS.large);
  });
});

describe("getStableConfig", () => {
  it("returns the stable sub-config for each size", () => {
    expect(getStableConfig("small")).toBe(WORLD_SIZE_CONFIGS.small.stables);
    expect(getStableConfig("medium")).toBe(WORLD_SIZE_CONFIGS.medium.stables);
    expect(getStableConfig("large")).toBe(WORLD_SIZE_CONFIGS.large.stables);
  });
});

describe("DEFAULT_WORLD_SIZE", () => {
  it("is 'large'", () => {
    expect(DEFAULT_WORLD_SIZE).toBe("large");
  });
});
