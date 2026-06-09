/**
 * trackConditions.degradation.test.ts — calculateConditionChange covers the
 * critical track-degradation paths feeding the weather phase.
 */
import { describe, it, expect } from "vitest";
import { calculateConditionChange } from "@/core/race/trackConditions";

describe("calculateConditionChange", () => {
  it("is a no-op on dry weather with low race count and good maintenance", () => {
    expect(calculateConditionChange("fast", "dry", 1, 1)).toBe("fast");
  });

  it("heavy rain over many races degrades a fast track", () => {
    const next = calculateConditionChange("fast", "heavy_rain", 8, 0.5);
    // fast -> good/soft/heavy/yielding depending on math; must move worse
    const tiers = ["fast", "good", "soft", "heavy", "yielding"];
    expect(tiers.indexOf(next)).toBeGreaterThan(tiers.indexOf("fast"));
  });

  it("better maintenance produces ≤ tiers of degradation than worse maintenance", () => {
    const tiers = ["fast", "good", "soft", "heavy", "yielding"];
    const lo = calculateConditionChange("good", "heavy_rain", 6, 0.1);
    const hi = calculateConditionChange("good", "heavy_rain", 6, 0.9);
    expect(tiers.indexOf(hi)).toBeLessThanOrEqual(tiers.indexOf(lo));
  });

  it("yielding never degrades past yielding", () => {
    expect(calculateConditionChange("yielding", "heavy_rain", 20, 0)).toBe("yielding");
  });

  it("returns a valid TrackCondition", () => {
    const result = calculateConditionChange("good", "light_rain", 4);
    expect(["fast", "good", "soft", "heavy", "yielding"]).toContain(result);
  });
});
