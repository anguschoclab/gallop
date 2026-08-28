import { describe, it, expect } from "vitest";
import {
  evaluateCashPressure,
  applyCashPressureToThreshold,
} from "@/core/stable/cashPressure";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { asHorseId } from "@/core/types/branded";

const roster = (n: number) => Array.from({ length: n }, (_, i) => asHorseId(`h${i}`));

describe("cashPressure", () => {
  it("rich stables feel no pressure", () => {
    const s = createTestStable({ cash: 5_000_000, horses: roster(10) });
    const r = evaluateCashPressure(s);
    expect(r.pressure).toBe(0);
    expect(r.label).toBe("comfortable");
  });

  it("nearly broke stables are desperate", () => {
    const s = createTestStable({ cash: 1000, horses: roster(20) });
    const r = evaluateCashPressure(s);
    expect(r.pressure).toBe(1);
    expect(r.label).toBe("desperate");
  });

  it("pressure increases as cash falls", () => {
    const high = evaluateCashPressure(createTestStable({ cash: 200_000, horses: roster(20) }));
    const low = evaluateCashPressure(createTestStable({ cash: 60_000, horses: roster(20) }));
    expect(low.pressure).toBeGreaterThan(high.pressure);
  });

  it("discounts thresholds under pressure", () => {
    expect(applyCashPressureToThreshold(1.0, 0)).toBe(1.0);
    expect(applyCashPressureToThreshold(1.0, 1)).toBeCloseTo(0.75);
    expect(applyCashPressureToThreshold(1.0, 0.5)).toBeLessThan(1.0);
  });
});
