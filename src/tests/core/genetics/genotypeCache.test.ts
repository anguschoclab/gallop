import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cachedSimulation,
  cachedCoi,
  cachedBloodline,
  cachedCompat,
  invalidateCompatFor,
  clearSimulatorCache,
  clearAllCaches,
  getCacheStats,
} from "@/domains/genetics/simulation/genotypeCache";

describe("genotypeCache", () => {
  beforeEach(() => {
    clearAllCaches();
  });

  it("caches simulation results", () => {
    const computeFn = vi.fn().mockReturnValue({ stats: { speed: 50 } } as any);

    const result1 = cachedSimulation("sire1", "dam1", computeFn);
    const result2 = cachedSimulation("sire1", "dam1", computeFn);

    expect(result1).toEqual({ stats: { speed: 50 } });
    expect(result1).toBe(result2);
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it("caches COI results", () => {
    const computeFn = vi.fn().mockReturnValue(0.125);

    const result1 = cachedCoi("sire1", "dam1", computeFn);
    const result2 = cachedCoi("sire1", "dam1", computeFn);

    expect(result1).toBe(0.125);
    expect(result2).toBe(0.125);
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it("caches bloodline results", () => {
    const computeFn = vi.fn().mockReturnValue("Storm Cat" as any);

    const result1 = cachedBloodline("horse1", computeFn);
    const result2 = cachedBloodline("horse1", computeFn);

    expect(result1).toBe("Storm Cat");
    expect(result2).toBe("Storm Cat");
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it("caches compatibility results", () => {
    const computeFn = vi.fn().mockReturnValue({ rating: "A", score: 95 } as any);

    const result1 = cachedCompat("sire1", "dam1", computeFn);
    const result2 = cachedCompat("sire1", "dam1", computeFn);

    expect(result1).toEqual({ rating: "A", score: 95 });
    expect(result1).toBe(result2);
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it("invalidates compatibility cache for a specific horse", () => {
    const computeFn = vi.fn().mockReturnValue({ rating: "A", score: 95 } as any);

    cachedCompat("sire1", "dam1", computeFn);
    cachedCompat("sire2", "dam1", computeFn);
    cachedCompat("sire1", "dam2", computeFn);

    expect(getCacheStats().compat).toBe(3);

    invalidateCompatFor("sire1");

    expect(getCacheStats().compat).toBe(1);

    const result2 = cachedCompat("sire2", "dam1", computeFn);
    expect(computeFn).toHaveBeenCalledTimes(3);
  });

  it("clears simulation cache independently", () => {
    const computeFn = vi.fn().mockReturnValue({ stats: { speed: 50 } } as any);
    const coiComputeFn = vi.fn().mockReturnValue(0.125);

    cachedSimulation("sire1", "dam1", computeFn);
    cachedCoi("sire1", "dam1", coiComputeFn);

    expect(getCacheStats().simulator).toBe(1);
    expect(getCacheStats().coi).toBe(1);

    clearSimulatorCache();

    expect(getCacheStats().simulator).toBe(0);
    expect(getCacheStats().coi).toBe(1);
  });

  it("clears all caches correctly", () => {
    const simFn = vi.fn().mockReturnValue({ stats: { speed: 50 } } as any);
    const coiFn = vi.fn().mockReturnValue(0.125);
    const bloodFn = vi.fn().mockReturnValue("Storm Cat" as any);
    const compatFn = vi.fn().mockReturnValue({ rating: "A", score: 95 } as any);

    cachedSimulation("sire1", "dam1", simFn);
    cachedCoi("sire1", "dam1", coiFn);
    cachedBloodline("horse1", bloodFn);
    cachedCompat("sire1", "dam1", compatFn);

    expect(getCacheStats()).toEqual({
      simulator: 1,
      coi: 1,
      bloodline: 1,
      compat: 1,
    });

    clearAllCaches();

    expect(getCacheStats()).toEqual({
      simulator: 0,
      coi: 0,
      bloodline: 0,
      compat: 0,
    });
  });
});
