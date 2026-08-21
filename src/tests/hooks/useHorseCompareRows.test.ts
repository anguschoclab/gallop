import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHorseCompareRows, bestIdx } from "@/hooks/horse/useHorseCompareRows";
import type { Horse } from "@/game/types";

vi.mock("@/core/horse/stats", () => ({
  calculateOverallRating: vi.fn((h: Horse) => {
    const s = h.stats;
    return Math.round((s.speed + s.stamina + s.acceleration + s.consistency) / 4);
  }),
}));

vi.mock("@/core/horse/pricing", () => ({
  horseMarketValue: vi.fn((h: Horse) => h.potential * 1000),
}));

import { calculateOverallRating } from "@/core/horse/stats";
import { horseMarketValue } from "@/core/horse/pricing";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    form: 50,
    potential: 75,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      temperament: 70,
      conformation: 70,
      consistency: 70,
    } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    ownership: { type: "player" },
    silk: "#ff0000",
    ...overrides,
  }) as unknown as Horse;

describe("useHorseCompareRows", () => {
  it("returns empty array for zero horses", () => {
    const { result } = renderHook(() => useHorseCompareRows([], []));
    expect(result.current.rows).toEqual([]);
  });

  it("returns 10 rows for 2 horses", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    expect(result.current.rows).toHaveLength(10);
    const labels = result.current.rows.map((r) => r.label);
    expect(labels).toEqual([
      "OVR",
      "Potential",
      "Energy",
      "Form",
      "Valuation",
      "Career starts",
      "Record (W-P-S)",
      "Earnings",
      "Beyer avg",
      "Beyer range",
    ]);
  });

  it("OVR row has correct numeric, barValues, higherIsBetter", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const ovrRow = result.current.rows[0];
    expect(ovrRow.label).toBe("OVR");
    expect(ovrRow.higherIsBetter).toBe(true);
    expect(ovrRow.numeric).toEqual([70, 70]);
    expect(ovrRow.barValues).toEqual([70, 70]);
  });

  it("Energy row formats as 'N/100' string", () => {
    const h1 = mkHorse({ id: "h1", energy: 75.4 });
    const h2 = mkHorse({ id: "h2", energy: 90 });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const energyRow = result.current.rows[2];
    expect(energyRow.values[0]).toBe("75/100");
    expect(energyRow.values[1]).toBe("90/100");
  });

  it("Form row prefixes positive with '+'", () => {
    const h1 = mkHorse({ id: "h1", form: 10 });
    const h2 = mkHorse({ id: "h2", form: -5 });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const formRow = result.current.rows[3];
    expect(formRow.values[0]).toBe("+10");
    expect(formRow.values[1]).toBe("-5");
  });

  it("Beyer avg handles null (no race history)", () => {
    const h1 = mkHorse({ id: "h1", raceHistory: [] });
    const h2 = mkHorse({ id: "h2", raceHistory: [] });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const beyerAvgRow = result.current.rows[8];
    expect(beyerAvgRow.values[0]).toBe("—");
    expect(beyerAvgRow.values[1]).toBe("—");
  });

  it("Beyer avg computes average from race history", () => {
    const h1 = mkHorse({
      id: "h1",
      raceHistory: [
        { position: 1, beyer: 80, raceName: "R1", day: 1, raceId: "r1" },
        { position: 1, beyer: 90, raceName: "R2", day: 2, raceId: "r2" },
        { position: 1, beyer: 100, raceName: "R3", day: 3, raceId: "r3" },
      ] as any,
    });
    const h2 = mkHorse({ id: "h2" });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const beyerAvgRow = result.current.rows[8];
    expect(beyerAvgRow.values[0]).toBe(90);
  });

  it("Beyer range formats as 'min–max'", () => {
    const h1 = mkHorse({
      id: "h1",
      raceHistory: [
        { position: 1, beyer: 80, raceName: "R1", day: 1, raceId: "r1" },
        { position: 1, beyer: 100, raceName: "R2", day: 2, raceId: "r2" },
      ] as any,
    });
    const h2 = mkHorse({ id: "h2" });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const beyerRangeRow = result.current.rows[9];
    expect(beyerRangeRow.values[0]).toBe("80–100");
  });

  it("Career record counts W-P-S correctly", () => {
    const h1 = mkHorse({
      id: "h1",
      raceHistory: [
        { position: 1, raceName: "R1", day: 1, raceId: "r1" },
        { position: 2, raceName: "R2", day: 2, raceId: "r2" },
        { position: 3, raceName: "R3", day: 3, raceId: "r3" },
        { position: 1, raceName: "R4", day: 4, raceId: "r4" },
        { position: 4, raceName: "R5", day: 5, raceId: "r5" },
      ] as any,
    });
    const h2 = mkHorse({ id: "h2" });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const recordRow = result.current.rows.find((r) => r.label === "Record (W-P-S)")!;
    expect(recordRow.values[0]).toBe("2-1-1");
  });

  it("Career record sums earnings with ?? 0 fallback", () => {
    const h1 = mkHorse({
      id: "h1",
      raceHistory: [
        { position: 1, purseEarned: 5000, raceName: "R1", day: 1, raceId: "r1" },
        { position: 2, purseEarned: undefined, raceName: "R2", day: 2, raceId: "r2" },
        { position: 3, purseEarned: 1000, raceName: "R3", day: 3, raceId: "r3" },
      ] as any,
    });
    const h2 = mkHorse({ id: "h2" });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const earningsRow = result.current.rows.find((r) => r.label === "Earnings")!;
    expect(earningsRow.numeric![0]).toBe(6000);
  });

  it("Valuation uses horseMarketValue", () => {
    const h1 = mkHorse({ id: "h1", potential: 80 });
    const h2 = mkHorse({ id: "h2", potential: 60 });
    const { result } = renderHook(() => useHorseCompareRows([h1, h2], []));
    const valRow = result.current.rows.find((r) => r.label === "Valuation")!;
    expect(horseMarketValue).toHaveBeenCalled();
    expect(valRow.numeric![0]).toBe(80000);
    expect(valRow.numeric![1]).toBe(60000);
  });
});

describe("bestIdx", () => {
  it("returns 0 for single highest value", () => {
    expect(bestIdx([10, 5, 3], true)).toBe(0);
  });

  it("returns -1 for ties", () => {
    expect(bestIdx([10, 10, 3], true)).toBe(-1);
  });

  it("handles higher=false (lower is better)", () => {
    expect(bestIdx([10, 5, 3], false)).toBe(2);
  });

  it("handles all-equal values", () => {
    expect(bestIdx([5, 5, 5], true)).toBe(-1);
  });
});
