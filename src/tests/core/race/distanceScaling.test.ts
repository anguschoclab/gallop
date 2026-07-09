import { describe, it, expect } from "vitest";
import { computeDistanceScaling } from "@/core/race/engine/runnerBuilder";

describe("computeDistanceScaling", () => {
  it("returns neutral values when race distance equals preferred distance", () => {
    const r = computeDistanceScaling(1600, 1600);
    expect(r.distanceRatio).toBe(1);
    expect(r.distanceDeviation).toBe(0);
    expect(r.distanceMod).toBe(1);
    expect(r.distanceStaminaMul).toBe(1);
  });

  it("returns deviation < 0 and staminaMul = 1 for shorter than preferred", () => {
    const r = computeDistanceScaling(1600, 800);
    expect(r.distanceRatio).toBe(0.5);
    expect(r.distanceDeviation).toBe(-1);
    expect(r.distanceMod).toBeCloseTo(0.92, 10);
    expect(r.distanceStaminaMul).toBe(1);
  });

  it("returns deviation > 0 and staminaMul > 1 for longer than preferred", () => {
    const r = computeDistanceScaling(1600, 3200);
    expect(r.distanceRatio).toBe(2);
    expect(r.distanceDeviation).toBe(1);
    expect(r.distanceMod).toBeCloseTo(0.92, 10);
    expect(r.distanceStaminaMul).toBeCloseTo(1.2, 10);
  });

  it("produces symmetric distanceMod for 2x and 0.5x ratios", () => {
    const longer = computeDistanceScaling(1600, 3200);
    const shorter = computeDistanceScaling(1600, 800);
    expect(longer.distanceMod).toBe(shorter.distanceMod);
  });

  it("clamps distanceMod at 0.85 for very large deviation", () => {
    const r = computeDistanceScaling(1600, 16000);
    expect(r.distanceMod).toBe(0.85);
  });

  it("clamps distanceStaminaMul at 1.25 for very large positive deviation", () => {
    const r = computeDistanceScaling(1600, 16000);
    expect(r.distanceStaminaMul).toBe(1.25);
  });

  it("keeps distanceStaminaMul = 1 for any negative deviation", () => {
    const r = computeDistanceScaling(1600, 100);
    expect(r.distanceDeviation).toBeLessThan(0);
    expect(r.distanceStaminaMul).toBe(1);
  });

  it("treats aptitude 0 as falsy and defaults to 1600", () => {
    const r = computeDistanceScaling(0, 1600);
    expect(r.preferredDistance).toBe(1600);
  });

  it("defaults preferredDistance to 1600 when aptitude is undefined", () => {
    const r = computeDistanceScaling(undefined, 1600);
    expect(r.preferredDistance).toBe(1600);
  });

  it("clamps distanceMod at 0.85 for very short race", () => {
    const r = computeDistanceScaling(1600, 200);
    expect(r.distanceDeviation).toBeCloseTo(-3, 5);
    expect(r.distanceMod).toBe(0.85);
    expect(r.distanceStaminaMul).toBe(1);
  });

  it("computes moderate longer deviation correctly", () => {
    const r = computeDistanceScaling(2000, 2400);
    expect(r.distanceRatio).toBe(1.2);
    expect(r.distanceDeviation).toBeCloseTo(Math.log2(1.2), 10);
    expect(r.distanceMod).toBeCloseTo(1 - Math.min(0.15, Math.abs(Math.log2(1.2)) * 0.08), 10);
    expect(r.distanceStaminaMul).toBeCloseTo(1 + Math.min(0.25, Math.log2(1.2) * 0.2), 10);
  });

  it("computes moderate shorter deviation correctly", () => {
    const r = computeDistanceScaling(2000, 1600);
    expect(r.distanceRatio).toBe(0.8);
    expect(r.distanceDeviation).toBeCloseTo(Math.log2(0.8), 10);
    expect(r.distanceStaminaMul).toBe(1);
  });

  it("returns all neutral at exactly ratio 1.0 with different aptitude", () => {
    const r = computeDistanceScaling(2400, 2400);
    expect(r.distanceRatio).toBe(1);
    expect(r.distanceDeviation).toBe(0);
    expect(r.distanceMod).toBe(1);
    expect(r.distanceStaminaMul).toBe(1);
  });

  it("clamps distanceMod at 0.85 for extreme short race with high aptitude", () => {
    const r = computeDistanceScaling(3200, 200);
    expect(r.distanceDeviation).toBeLessThan(-3);
    expect(r.distanceMod).toBe(0.85);
  });

  it("clamps both distanceMod and staminaMul for extreme long race with low aptitude", () => {
    const r = computeDistanceScaling(800, 6400);
    expect(r.distanceDeviation).toBe(3);
    expect(r.distanceMod).toBe(0.85);
    expect(r.distanceStaminaMul).toBe(1.25);
  });
});
