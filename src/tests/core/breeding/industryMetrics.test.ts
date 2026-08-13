import { describe, it, expect, vi } from "vitest";
import { computeIndustryMeanEarnings } from "@/core/breeding/industryMetrics";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

describe("industryMetrics", () => {
  it("returns 0 if there are no horses", () => {
    expect(computeIndustryMeanEarnings([])).toBe(0);
  });

  it("filters out horses younger than age 2", () => {
    const yearling = createTestHorse({
      id: "h1",
      age: 1,
      raceHistory: [{ purseEarned: 10000 }] as any,
    });
    expect(computeIndustryMeanEarnings([yearling])).toBe(0);
  });

  it("filters out horses with no race history", () => {
    const unraced = createTestHorse({ id: "h2", age: 3, raceHistory: [] });
    expect(computeIndustryMeanEarnings([unraced])).toBe(0);
  });

  it("computes average earnings of valid runners", () => {
    const h1 = createTestHorse({
      id: "h1",
      age: 3,
      raceHistory: [{ purseEarned: 20000 }, { purseEarned: 10000 }] as any,
    }); // Total: 30000
    const h2 = createTestHorse({ id: "h2", age: 4, raceHistory: [{ purseEarned: 10000 }] as any }); // Total: 10000
    const h3 = createTestHorse({
      id: "h3",
      age: 2,
      raceHistory: [{ purseEarned: 0 }, { purseEarned: 5000 }] as any,
    }); // Total: 5000

    // Average = (30000 + 10000 + 5000) / 3 = 15000
    expect(computeIndustryMeanEarnings([h1, h2, h3])).toBe(15000);
  });

  it("calculates earnings from purse and split when purseEarned is undefined", () => {
    // 1st place in a graded race, GRADED_PRIZE_SPLIT[0] = 0.7. Purse 100000 => 70000.
    const h1 = createTestHorse({
      id: "h1",
      age: 3,
      raceHistory: [{ position: 1, purse: 100000, grade: 1 } as any],
    });
    // 2nd place in a non-graded race, PRIZE_SPLIT[1] = 0.25. Purse 50000 => 12500.
    const h2 = createTestHorse({
      id: "h2",
      age: 3,
      raceHistory: [{ position: 2, purse: 50000 } as any],
    });

    // Average = (70000 + 12500) / 2 = 41250
    expect(computeIndustryMeanEarnings([h1, h2])).toBe(41250);
  });
});
