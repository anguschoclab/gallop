import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useFacilityTiers,
  FACILITY_LEVELS,
  getRankValue,
} from "@/hooks/facilities/useFacilityTiers";
import type { FacilityLevel } from "@/core/facilities";

function makeFacility(level: FacilityLevel, upgradeCost: number) {
  return { level, upgradeCost, maintenanceCost: 10 };
}

describe("useFacilityTiers - undefined facility", () => {
  it("currentLevelIndex is -1", () => {
    const { result } = renderHook(() => useFacilityTiers(undefined, 1000));
    expect(result.current.currentLevelIndex).toBe(-1);
  });

  it("maxLevel is false", () => {
    const { result } = renderHook(() => useFacilityTiers(undefined, 1000));
    expect(result.current.maxLevel).toBe(false);
  });

  it("upgradeCost is 0", () => {
    const { result } = renderHook(() => useFacilityTiers(undefined, 1000));
    expect(result.current.upgradeCost).toBe(0);
  });

  it("canAfford is true (cash >= 0)", () => {
    const { result } = renderHook(() => useFacilityTiers(undefined, 0));
    expect(result.current.canAfford).toBe(true);
  });

  it("rankVal is 0", () => {
    const { result } = renderHook(() => useFacilityTiers(undefined, 1000));
    expect(result.current.rankVal).toBe(0);
  });

  it("enabledWorkouts is empty array", () => {
    const { result } = renderHook(() => useFacilityTiers(undefined, 1000));
    expect(result.current.enabledWorkouts).toEqual([]);
  });
});

describe("useFacilityTiers - each level", () => {
  const levels: FacilityLevel[] = ["basic", "standard", "premium", "elite"];

  it("currentLevelIndex matches expected index", () => {
    levels.forEach((level, i) => {
      const { result } = renderHook(() => useFacilityTiers(makeFacility(level, 5000), 10000));
      expect(result.current.currentLevelIndex).toBe(i);
    });
  });

  it("maxLevel is true only for elite", () => {
    levels.forEach((level) => {
      const { result } = renderHook(() => useFacilityTiers(makeFacility(level, 5000), 10000));
      expect(result.current.maxLevel).toBe(level === "elite");
    });
  });

  it("rankVal matches expected value", () => {
    const expected: Record<FacilityLevel, number> = {
      basic: 1,
      standard: 2,
      premium: 3,
      elite: 4,
    };
    levels.forEach((level) => {
      const { result } = renderHook(() => useFacilityTiers(makeFacility(level, 5000), 10000));
      expect(result.current.rankVal).toBe(expected[level]);
    });
  });
});

describe("useFacilityTiers - canAfford boundary", () => {
  it("canAfford is true when cash === upgradeCost (exact)", () => {
    const { result } = renderHook(() => useFacilityTiers(makeFacility("basic", 5000), 5000));
    expect(result.current.canAfford).toBe(true);
  });

  it("canAfford is false when cash < upgradeCost", () => {
    const { result } = renderHook(() => useFacilityTiers(makeFacility("basic", 5000), 4999));
    expect(result.current.canAfford).toBe(false);
  });

  it("canAfford is true when cash > upgradeCost", () => {
    const { result } = renderHook(() => useFacilityTiers(makeFacility("basic", 5000), 5001));
    expect(result.current.canAfford).toBe(true);
  });
});

describe("getRankValue", () => {
  it("returns correct values for all levels + unknown", () => {
    expect(getRankValue("basic")).toBe(1);
    expect(getRankValue("standard")).toBe(2);
    expect(getRankValue("premium")).toBe(3);
    expect(getRankValue("elite")).toBe(4);
    expect(getRankValue("unknown")).toBe(0);
  });
});

describe("FACILITY_LEVELS", () => {
  it("is the expected array", () => {
    expect(FACILITY_LEVELS).toEqual(["basic", "standard", "premium", "elite"]);
  });
});
