import { describe, it, expect } from "vitest";
import {
  horseMarketValue,
  horsePriceWithPedigree,
  estimateBreedingValue,
} from "@/core/horse/pricing";
import {
  createTestHorse,
  createTestColt,
  createTestStallion,
  createTestMare,
  createTestGelding,
} from "@/tests/helpers/createTestHorse";

describe("horseMarketValue", () => {
  // ---------------------------------------------------------------------------
  // 1: Gelding returns racing only
  // ---------------------------------------------------------------------------
  it("gelding returns racing value only (no breeding component)", () => {
    const gelding = createTestGelding({ age: 5 });
    const result = horseMarketValue(gelding, [gelding]);
    const racing = horsePriceWithPedigree(gelding, [gelding]);
    expect(result).toBe(racing);
  });

  // ---------------------------------------------------------------------------
  // 2: Yearling (age 1) uses 50/50 weighting
  // ---------------------------------------------------------------------------
  it("yearling (age 1) uses 50/50 racing/breeding weighting", () => {
    const colt = createTestColt({ age: 1 });
    const racing = horsePriceWithPedigree(colt, [colt]);
    const breeding = estimateBreedingValue(colt, [colt]);
    const expected = Math.round((racing * 0.5 + breeding * 0.5) / 50) * 50;
    expect(horseMarketValue(colt, [colt])).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // 3: Racing prime (age 3) uses racing-heavy weighting
  // ---------------------------------------------------------------------------
  it("racing prime (age 3–6) uses racing + breeding*0.35 weighting", () => {
    const colt = createTestColt({ age: 3 });
    const racing = horsePriceWithPedigree(colt, [colt]);
    const breeding = estimateBreedingValue(colt, [colt]);
    const expected = Math.round((racing + breeding * 0.35) / 50) * 50;
    expect(horseMarketValue(colt, [colt])).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // 4: Older active (age 8) uses breeding-heavy weighting
  // ---------------------------------------------------------------------------
  it("older active (age 7+) uses racing*0.4 + breeding*0.8 weighting", () => {
    const stallion = createTestStallion({ age: 8 });
    const racing = horsePriceWithPedigree(stallion, [stallion]);
    const breeding = estimateBreedingValue(stallion, [stallion]);
    const expected = Math.round((racing * 0.4 + breeding * 0.8) / 50) * 50;
    expect(horseMarketValue(stallion, [stallion])).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // 5: Retired horse uses retired weighting
  // ---------------------------------------------------------------------------
  it("retired horse uses racing*0.15 + breeding*0.9 weighting", () => {
    const mare = createTestMare({
      age: 8,
      lifecycleStatus: "retired",
    });
    const racing = horsePriceWithPedigree(mare, [mare]);
    const breeding = estimateBreedingValue(mare, [mare]);
    const expected = Math.round((racing * 0.15 + breeding * 0.9) / 50) * 50;
    expect(horseMarketValue(mare, [mare])).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // 6: racingViable=false triggers retired weighting
  // ---------------------------------------------------------------------------
  it("racingViable=false triggers retired weighting even if lifecycleStatus is active", () => {
    const stallion = createTestStallion({
      age: 6,
      lifecycleStatus: "active",
      racingViable: false,
    });
    const racing = horsePriceWithPedigree(stallion, [stallion]);
    const breeding = estimateBreedingValue(stallion, [stallion]);
    const expected = Math.round((racing * 0.15 + breeding * 0.9) / 50) * 50;
    expect(horseMarketValue(stallion, [stallion])).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // 7: Gelded colt returns racing only
  // ---------------------------------------------------------------------------
  it("gelded colt (gender=colt, gelded=true) returns racing value only", () => {
    const geldedColt = createTestColt({ age: 5, gelded: true });
    const result = horseMarketValue(geldedColt, [geldedColt]);
    const racing = horsePriceWithPedigree(geldedColt, [geldedColt]);
    expect(result).toBe(racing);
  });

  // ---------------------------------------------------------------------------
  // 8: Yearling colt returns positive value
  // ---------------------------------------------------------------------------
  it("yearling colt returns positive market value", () => {
    const colt = createTestColt({ age: 1 });
    expect(horseMarketValue(colt, [colt])).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 9: Result is always a multiple of 50
  // ---------------------------------------------------------------------------
  it("result is always a multiple of 50", () => {
    const horses = [
      createTestColt({ age: 1 }),
      createTestStallion({ age: 3 }),
      createTestStallion({ age: 8 }),
      createTestMare({ age: 6 }),
      createTestMare({ age: 10, lifecycleStatus: "retired", racingViable: false }),
      createTestGelding({ age: 5 }),
      createTestColt({ age: 5, gelded: true }),
    ];
    for (const h of horses) {
      expect(horseMarketValue(h, [h]) % 50).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 10: Result is >= 0 with very low stats
  // ---------------------------------------------------------------------------
  it("result is >= 0 with very low stats", () => {
    const lowStats = createTestStallion({
      age: 5,
      stats: {
        speed: 1,
        stamina: 1,
        acceleration: 1,
        consistency: 1,
        temperament: 1,
        conformation: 1,
      },
      potential: 1,
      fame: 0,
    });
    expect(horseMarketValue(lowStats, [lowStats])).toBeGreaterThanOrEqual(0);
  });
});
