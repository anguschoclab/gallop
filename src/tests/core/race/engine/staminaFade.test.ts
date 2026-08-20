import { describe, it, expect } from "vitest";
import { calculateStaminaMultiplier } from "@/core/race/engine/staminaFade";
import { createTestHorse } from "@/tests/helpers";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";
import { createTestRng } from "@/tests/helpers";

function mkRunner(overrides: Partial<Runner> = {}): Runner {
  const horse = createTestHorse();
  return {
    horseId: "h1",
    name: "Test Runner",
    silk: "#ff0000",
    owned: true,
    position: 0,
    velocity: 16,
    finishTime: null,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 20,
    accel: 5,
    staminaFactor: 0.9,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "P",
    draftingHorseId: null,
    horse,
    weight: 500,
    ...overrides,
  } as Runner;
}

describe("calculateStaminaMultiplier", () => {
  it("returns 1 when progress is below STAMINA_FADE_START (0.6)", () => {
    const r = mkRunner();
    const result = calculateStaminaMultiplier(r, 0.3, 1600);
    expect(result).toBe(1);
  });

  it("returns 1 at exactly progress = 0.6 (fade starts above 0.6)", () => {
    const r = mkRunner();
    const result = calculateStaminaMultiplier(r, 0.6, 1600);
    expect(result).toBe(1);
  });

  it("returns < 1 when progress > STAMINA_FADE_START", () => {
    const r = mkRunner({ staminaFactor: 0.8 });
    const result = calculateStaminaMultiplier(r, 0.8, 1600);
    expect(result).toBeLessThan(1);
    expect(result).toBeGreaterThan(0);
  });

  it("returns lower multiplier for lower staminaFactor at same progress", () => {
    const rHigh = mkRunner({ staminaFactor: 0.95 });
    const rLow = mkRunner({ staminaFactor: 0.5 });
    const progress = 0.9;
    const resultHigh = calculateStaminaMultiplier(rHigh, progress, 1600);
    const resultLow = calculateStaminaMultiplier(rLow, progress, 1600);
    expect(resultHigh).toBeGreaterThan(resultLow);
  });

  it("applies drafting stamina preserve when draftingHorseId is set", () => {
    const r = mkRunner({ staminaFactor: 0.7, draftingHorseId: "h2" });
    const rNoDraft = mkRunner({ staminaFactor: 0.7, draftingHorseId: null });
    const progress = 0.9;
    const resultDraft = calculateStaminaMultiplier(r, progress, 1600);
    const resultNoDraft = calculateStaminaMultiplier(rNoDraft, progress, 1600);
    expect(resultDraft).toBeGreaterThan(resultNoDraft);
  });

  it("applies pace pressure penalty for E runningStyle when pacePressure > 0", () => {
    const pace: PaceContext = {
      leaderPos: 800,
      leaderVelocity: 18,
      leadGroupCount: 3,
      pacePressure: 0.5,
      progress: 0.8,
      laneDensity: [],
      paceRating: 1,
    };
    const r = mkRunner({ runningStyle: "E", staminaFactor: 0.9 });
    const result = calculateStaminaMultiplier(r, 0.8, 1600, pace);
    const resultNoPace = calculateStaminaMultiplier(r, 0.8, 1600);
    expect(result).toBeLessThan(resultNoPace);
  });

  it("does not apply pace pressure for non-E runningStyle", () => {
    const pace: PaceContext = {
      leaderPos: 800,
      leaderVelocity: 18,
      leadGroupCount: 3,
      pacePressure: 0.5,
      progress: 0.8,
      laneDensity: [],
      paceRating: 1,
    };
    const r = mkRunner({ runningStyle: "P", staminaFactor: 0.9 });
    const result = calculateStaminaMultiplier(r, 0.8, 1600, pace);
    const resultNoPace = calculateStaminaMultiplier(r, 0.8, 1600);
    expect(result).toBeCloseTo(resultNoPace, 6);
  });

  it("applies save tactics bonus for closer with late move timing", () => {
    const r = mkRunner({
      staminaFactor: 0.7,
      jockeyInstructions: {
        ridingStyle: "closer",
        moveTiming: "late",
      } as any,
    });
    const result = calculateStaminaMultiplier(r, 0.65, 1600);
    const rNoInstructions = mkRunner({ staminaFactor: 0.7 });
    const resultNoInstructions = calculateStaminaMultiplier(rNoInstructions, 0.65, 1600);
    expect(result).toBeGreaterThan(resultNoInstructions);
  });

  it("applies early speed penalty for E style in high lane early in race", () => {
    const r = mkRunner({ runningStyle: "E", lane: 3 });
    const result = calculateStaminaMultiplier(r, 0.1, 1600);
    expect(result).toBeLessThan(1);
  });

  it("does not apply early speed penalty for E style in low lane", () => {
    const r = mkRunner({ runningStyle: "E", lane: 1 });
    const result = calculateStaminaMultiplier(r, 0.1, 1600);
    expect(result).toBe(1);
  });

  it("approaches 0 multiplier as progress approaches 1 with low stamina", () => {
    const r = mkRunner({ staminaFactor: 0.3 });
    const result = calculateStaminaMultiplier(r, 0.99, 1600);
    expect(result).toBeLessThan(0.5);
  });

  it("uses smoothstep fade curve (non-linear)", () => {
    const r = mkRunner({ staminaFactor: 0.5 });
    // At progress=0.7, linearFade = 0.25
    // Linear: 1 - 0.5 * 0.25 = 0.875
    // Smoothstep: 0.25^2 * (3 - 0.5) = 0.15625 → 1 - 0.5 * 0.15625 = 0.921875
    const result = calculateStaminaMultiplier(r, 0.7, 1600);
    const linearResult = 1 - (1 - 0.5) * ((0.7 - 0.6) / 0.4);
    // Smoothstep should give a different (non-linear) result
    expect(result).not.toBeCloseTo(linearResult, 2);
    expect(result).toBeCloseTo(0.921875, 4);
  });
});
