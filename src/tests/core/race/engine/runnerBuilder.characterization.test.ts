import { describe, it, expect } from "vitest";
import { paceShapeMul, styleStaminaFactor } from "@/core/race/engine/runnerBuilder";

describe("paceShapeMul", () => {
  it("should give E style a boost at start (progress < 0.1)", () => {
    const result = paceShapeMul("E", 0.05);
    expect(result).toBeCloseTo(1.02 + 0.1 * 0.05, 4);
  });

  it("should give E style decreasing multiplier after start", () => {
    const result = paceShapeMul("E", 0.5);
    expect(result).toBeCloseTo(1.04 - 0.06 * 0.5, 4);
  });

  it("should give E style multiplier < 1 at finish line", () => {
    const result = paceShapeMul("E", 1.0);
    expect(result).toBeCloseTo(1.04 - 0.06, 4);
    expect(result).toBeLessThan(1);
  });

  it("should give EP style slight boost at start", () => {
    const result = paceShapeMul("EP", 0.05);
    expect(result).toBeCloseTo(1.0 + 0.1 * 0.05, 4);
  });

  it("should give EP style slight decrease after start", () => {
    const result = paceShapeMul("EP", 0.5);
    expect(result).toBeCloseTo(1.01 - 0.02 * 0.5, 4);
  });

  it("should give P style sinusoidal pattern", () => {
    const result0 = paceShapeMul("P", 0);
    const resultHalf = paceShapeMul("P", 0.5);
    const result1 = paceShapeMul("P", 1);
    expect(result0).toBeCloseTo(0.98, 4);
    expect(resultHalf).toBeCloseTo(0.98 + 0.04 * Math.sin(Math.PI * 0.5), 4);
    expect(result1).toBeCloseTo(0.98, 4);
  });

  it("should give S style low multiplier early", () => {
    const result = paceShapeMul("S", 0.05);
    expect(result).toBe(0.95);
  });

  it("should give S style gradual increase in mid-race", () => {
    const result = paceShapeMul("S", 0.3);
    expect(result).toBeCloseTo(0.94 + 0.04 * 0.3, 4);
  });

  it("should give S style strong finish in late race", () => {
    const result = paceShapeMul("S", 0.8);
    expect(result).toBeCloseTo(0.96 + 0.11 * ((0.8 - 0.6) / 0.4), 4);
    expect(result).toBeGreaterThan(0.95);
  });

  it("should give S style highest multiplier at finish", () => {
    const result = paceShapeMul("S", 1.0);
    expect(result).toBeCloseTo(0.96 + 0.11 * ((1.0 - 0.6) / 0.4), 4);
    expect(result).toBeGreaterThan(1.0);
  });
});

describe("styleStaminaFactor", () => {
  it("should reduce stamina for E style", () => {
    const result = styleStaminaFactor("E", 0.8);
    expect(result).toBeCloseTo(0.75, 4);
  });

  it("should keep stamina unchanged for EP style", () => {
    const result = styleStaminaFactor("EP", 0.8);
    expect(result).toBe(0.8);
  });

  it("should keep stamina unchanged for P style", () => {
    const result = styleStaminaFactor("P", 0.8);
    expect(result).toBe(0.8);
  });

  it("should increase stamina for S style", () => {
    const result = styleStaminaFactor("S", 0.8);
    expect(result).toBeCloseTo(0.85, 4);
  });

  it("should clamp E style to minimum 0.2", () => {
    const result = styleStaminaFactor("E", 0.1);
    expect(result).toBe(0.2);
  });

  it("should clamp S style to maximum 1.0", () => {
    const result = styleStaminaFactor("S", 0.98);
    expect(result).toBe(1);
  });
});
