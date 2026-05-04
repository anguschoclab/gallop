import { describe, it, expect } from "vitest";
import { clamp, clampStat, clampPotential } from "./math";

describe("math", () => {
  it("clamp restricts to [min, max]", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("clamp coerces NaN/Infinity to min", () => {
    expect(clamp(NaN, 0, 10)).toBe(0);
    expect(clamp(Infinity, 0, 10)).toBe(0);
    expect(clamp(-Infinity, 0, 10)).toBe(0);
  });

  it("clampStat rounds and bounds to [1, 100]", () => {
    expect(clampStat(50.4)).toBe(50);
    expect(clampStat(50.6)).toBe(51);
    expect(clampStat(101)).toBe(100);
    expect(clampStat(0)).toBe(1);
    expect(clampStat(-50)).toBe(1);
    expect(clampStat(200)).toBe(100);
  });

  it("clampPotential allows 0 floor", () => {
    expect(clampPotential(0)).toBe(0);
    expect(clampPotential(101)).toBe(100);
  });
});
