import { describe, it, expect } from "vitest";
import {
  calculateFrictionChange,
  isHatedRival,
  isFriendlyCompetitor,
  RIVALRY_CONSTANTS,
} from "@/core/stable/rivalry";

describe("calculateFrictionChange", () => {
  it("calculates positive and negative friction changes correctly", () => {
    expect(calculateFrictionChange(0, 15)).toBe(15);
    expect(calculateFrictionChange(20, -10)).toBe(10);
    expect(calculateFrictionChange(-30, -5)).toBe(-35);
  });

  it("clamps friction changes at the maximum allowed value", () => {
    expect(calculateFrictionChange(80, 50)).toBe(RIVALRY_CONSTANTS.FRICTION.MAX);
    expect(calculateFrictionChange(100, 10)).toBe(RIVALRY_CONSTANTS.FRICTION.MAX);
  });

  it("clamps friction changes at the minimum allowed value", () => {
    expect(calculateFrictionChange(-80, -50)).toBe(RIVALRY_CONSTANTS.FRICTION.MIN);
    expect(calculateFrictionChange(-100, -10)).toBe(RIVALRY_CONSTANTS.FRICTION.MIN);
  });
});

describe("isHatedRival", () => {
  it("returns true when friction is 70 or higher", () => {
    expect(isHatedRival(70)).toBe(true);
    expect(isHatedRival(99)).toBe(true);
  });

  it("returns false when friction is strictly less than 70", () => {
    expect(isHatedRival(69)).toBe(false);
    expect(isHatedRival(0)).toBe(false);
    expect(isHatedRival(-100)).toBe(false);
  });
});

describe("isFriendlyCompetitor", () => {
  it("returns true when friction is -50 or lower", () => {
    expect(isFriendlyCompetitor(-50)).toBe(true);
    expect(isFriendlyCompetitor(-80)).toBe(true);
    expect(isFriendlyCompetitor(-100)).toBe(true);
  });

  it("returns false when friction is strictly greater than -50", () => {
    expect(isFriendlyCompetitor(-49)).toBe(false);
    expect(isFriendlyCompetitor(0)).toBe(false);
    expect(isFriendlyCompetitor(50)).toBe(false);
  });
});
