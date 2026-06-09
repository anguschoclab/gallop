import { describe, it, expect } from "vitest";
import { calculatePeakingIndex } from "@/core/health/banister";

describe("Health System - Banister calculatePeakingIndex", () => {
  it("should calculate correctly for positive inputs", () => {
    expect(calculatePeakingIndex(100, 50)).toBe(50);
  });

  it("should calculate correctly for zero inputs", () => {
    expect(calculatePeakingIndex(0, 0)).toBe(0);
  });

  it("should calculate correctly for negative inputs", () => {
    expect(calculatePeakingIndex(-50, -20)).toBe(-30);
  });

  it("should result in a negative index when fatigue > fitness", () => {
    expect(calculatePeakingIndex(20, 50)).toBe(-30);
  });

  it("should result in a positive index when fitness > fatigue", () => {
    expect(calculatePeakingIndex(80, 20)).toBe(60);
  });
});
