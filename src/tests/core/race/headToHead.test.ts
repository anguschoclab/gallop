import { describe, it, expect } from "vitest";
import { calculateHeadToHeadOdds, runHeadToHeadSimulation } from "@/core/race/headToHead";
import type { Horse } from "@/game/types";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    form: 50,
    stats: { speed: 70, stamina: 70, acceleration: 70, temperament: 70, durability: 70, consistency: 70 } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    owned: true,
    ...overrides,
  }) as Horse;

describe("calculateHeadToHeadOdds (lightweight)", () => {
  it("returns win percentages that sum to 1.0", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const results = calculateHeadToHeadOdds([h1, h2], 1600, "Turf");
    const sum = results.reduce((s, r) => s + r.winPct, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("horse with higher stats has higher win probability", () => {
    const h1 = mkHorse({ id: "h1", stats: { speed: 80, stamina: 80, acceleration: 80, temperament: 70, durability: 70, consistency: 70 } as any });
    const h2 = mkHorse({ id: "h2", stats: { speed: 60, stamina: 60, acceleration: 60, temperament: 70, durability: 70, consistency: 70 } as any });
    const results = calculateHeadToHeadOdds([h1, h2], 1600, "Turf");
    const r1 = results.find((r) => r.horseId === "h1")!;
    const r2 = results.find((r) => r.horseId === "h2")!;
    expect(r1.winPct).toBeGreaterThan(r2.winPct);
  });

  it("surface aptitude affects win probability", () => {
    const h1 = mkHorse({ id: "h1", surfaceAptitude: { Turf: 1.2, Dirt: 0.8, Synthetic: 0.95 } });
    const h2 = mkHorse({ id: "h2", surfaceAptitude: { Turf: 0.8, Dirt: 1.2, Synthetic: 0.95 } });
    const results = calculateHeadToHeadOdds([h1, h2], 1600, "Turf");
    const r1 = results.find((r) => r.horseId === "h1")!;
    const r2 = results.find((r) => r.horseId === "h2")!;
    expect(r1.winPct).toBeGreaterThan(r2.winPct);
  });

  it("distance aptitude affects win probability", () => {
    const h1 = mkHorse({ id: "h1", distanceAptitude: 1600 });
    const h2 = mkHorse({ id: "h2", distanceAptitude: 2400 });
    const results = calculateHeadToHeadOdds([h1, h2], 1600, "Turf");
    const r1 = results.find((r) => r.horseId === "h1")!;
    const r2 = results.find((r) => r.horseId === "h2")!;
    expect(r1.winPct).toBeGreaterThan(r2.winPct);
  });

  it("returns projected Beyer for each horse", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const results = calculateHeadToHeadOdds([h1, h2], 1600, "Turf");
    for (const r of results) {
      expect(r.projectedBeyer).toBeGreaterThanOrEqual(30);
      expect(r.projectedBeyer).toBeLessThanOrEqual(125);
    }
  });

  it("returns projected finish time for each horse", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const results = calculateHeadToHeadOdds([h1, h2], 1600, "Turf");
    for (const r of results) {
      expect(r.projectedFinishTime).toBeGreaterThan(0);
    }
  });

  it("handles 3 horses", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const h3 = mkHorse({ id: "h3" });
    const results = calculateHeadToHeadOdds([h1, h2, h3], 1600, "Turf");
    expect(results).toHaveLength(3);
    const sum = results.reduce((s, r) => s + r.winPct, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

describe("runHeadToHeadSimulation (Monte Carlo)", () => {
  it("returns win percentages that sum to 1.0", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const results = runHeadToHeadSimulation([h1, h2], 1600, "Turf", 10);
    const sum = results.reduce((s, r) => s + r.winPct, 0);
    expect(sum).toBeCloseTo(1.0, 1);
  });

  it("returns avg finish position for each horse", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const results = runHeadToHeadSimulation([h1, h2], 1600, "Turf", 10);
    for (const r of results) {
      expect(r.avgFinishPosition).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns Beyer range from simulation results", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const results = runHeadToHeadSimulation([h1, h2], 1600, "Turf", 10);
    for (const r of results) {
      expect(r.beyerRange[0]).toBeLessThanOrEqual(r.beyerRange[1]);
    }
  });

  it("returns finish time range", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const results = runHeadToHeadSimulation([h1, h2], 1600, "Turf", 10);
    for (const r of results) {
      expect(r.finishTimeRange[0]).toBeLessThanOrEqual(r.finishTimeRange[1]);
    }
  });

  it("is deterministic with same seed", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const r1 = runHeadToHeadSimulation([h1, h2], 1600, "Turf", 10, 42);
    const r2 = runHeadToHeadSimulation([h1, h2], 1600, "Turf", 10, 42);
    expect(r1).toEqual(r2);
  });

  it("handles 3 horses", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const h3 = mkHorse({ id: "h3" });
    const results = runHeadToHeadSimulation([h1, h2, h3], 1600, "Turf", 10);
    expect(results).toHaveLength(3);
  });
});
