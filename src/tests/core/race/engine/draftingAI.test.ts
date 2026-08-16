import { describe, it, expect } from "vitest";
import type { Runner, PaceContext } from "@/core/race/engine/runnerBuilder";

// These functions are currently private in simulation.ts.
// We test the enhanced logic via a new exported function:
// calculateStyleAwareDraftMultiplier(r, progress, sortedField)
// and enhanced getDraftingHorseId that considers cover.

import {
  calculateStyleAwareDraftMultiplier,
  getEnhancedDraftingHorseId,
  calculateRailSavingLane,
  calculateCoverModifier,
} from "@/core/race/engine/draftingAI";

function createMockRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    position: 100,
    lane: 1.2,
    velocity: 16,
    topSpeed: 18,
    accel: 5,
    staminaFactor: 0.8,
    noise: 0.5,
    affinityBonus: 0,
    runningStyle: "P",
    draftingHorseId: null,
    horse: { id: "h1", mudAptitude: 1.0, recoveryPoints: 100 } as any,
    jockey: {
      id: "j1",
      stats: { pacing: 70, positioning: 70, vigor: 70, gateSkill: 70, temperament: 70 },
      traits: [],
    } as any,
    weight: 118,
    finishTime: null,
    ...overrides,
  } as Runner;
}

describe("draftingAI", () => {
  describe("calculateStyleAwareDraftMultiplier", () => {
    it("returns base DRAFT_SPEED_BONUS when drafting for mid-pack styles", () => {
      const runner = createMockRunner({ runningStyle: "P", draftingHorseId: "h2" });
      const mul = calculateStyleAwareDraftMultiplier(runner, 0.3);
      expect(mul).toBeGreaterThan(1.0);
      expect(mul).toBeCloseTo(1.015, 2);
    });

    it("gives closers (S) a larger draft bonus", () => {
      const closer = createMockRunner({ runningStyle: "S", draftingHorseId: "h2" });
      const presser = createMockRunner({ runningStyle: "P", draftingHorseId: "h2" });
      const closerMul = calculateStyleAwareDraftMultiplier(closer, 0.3);
      const presserMul = calculateStyleAwareDraftMultiplier(presser, 0.3);
      expect(closerMul).toBeGreaterThan(presserMul);
    });

    it("gives front-runners (E) a smaller draft bonus", () => {
      const frontrunner = createMockRunner({ runningStyle: "E", draftingHorseId: "h2" });
      const presser = createMockRunner({ runningStyle: "P", draftingHorseId: "h2" });
      const frMul = calculateStyleAwareDraftMultiplier(frontrunner, 0.3);
      const pMul = calculateStyleAwareDraftMultiplier(presser, 0.3);
      expect(frMul).toBeLessThan(pMul);
    });

    it("returns 1.0 when not drafting", () => {
      const runner = createMockRunner({ draftingHorseId: null });
      const mul = calculateStyleAwareDraftMultiplier(runner, 0.3);
      expect(mul).toBe(1.0);
    });

    it("reduces draft bonus in late race (progress > 0.85)", () => {
      const runner = createMockRunner({ runningStyle: "P", draftingHorseId: "h2" });
      const earlyMul = calculateStyleAwareDraftMultiplier(runner, 0.3);
      const lateMul = calculateStyleAwareDraftMultiplier(runner, 0.9);
      expect(lateMul).toBeLessThan(earlyMul);
    });
  });

  describe("getEnhancedDraftingHorseId", () => {
    it("finds a horse within draft distance in a nearby lane", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const leader = createMockRunner({ horseId: "h2", position: 102, lane: 1.2 });
      const sortedField = [leader, runner];
      const draftId = getEnhancedDraftingHorseId(runner, sortedField);
      expect(draftId).toBe("h2");
    });

    it("returns null when no horse is within draft distance", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const leader = createMockRunner({ horseId: "h2", position: 110, lane: 1.2 });
      const sortedField = [leader, runner];
      const draftId = getEnhancedDraftingHorseId(runner, sortedField);
      expect(draftId).toBeNull();
    });

    it("returns null when horse is in a different lane (gap >= 0.8)", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const leader = createMockRunner({ horseId: "h2", position: 102, lane: 2.4 });
      const sortedField = [leader, runner];
      const draftId = getEnhancedDraftingHorseId(runner, sortedField);
      expect(draftId).toBeNull();
    });

    it("prefers drafting behind a horse in the same lane", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const sameLane = createMockRunner({ horseId: "h2", position: 102, lane: 1.2 });
      const offLane = createMockRunner({ horseId: "h3", position: 101, lane: 1.6 });
      const sortedField = [offLane, sameLane, runner];
      const draftId = getEnhancedDraftingHorseId(runner, sortedField);
      expect(draftId).toBe("h2");
    });
  });

  describe("calculateRailSavingLane", () => {
    it("returns lane 0 for closers (S) in late race", () => {
      const runner = createMockRunner({ runningStyle: "S", lane: 1.2 });
      const targetLane = calculateRailSavingLane(runner, 0.8);
      expect(targetLane).toBe(0);
    });

    it("returns lane 0 for stalkers (P) in late race", () => {
      const runner = createMockRunner({ runningStyle: "P", lane: 1.2 });
      const targetLane = calculateRailSavingLane(runner, 0.8);
      expect(targetLane).toBe(0);
    });

    it("does not shift to rail for front-runners (E)", () => {
      const runner = createMockRunner({ runningStyle: "E", lane: 1.2 });
      const targetLane = calculateRailSavingLane(runner, 0.8);
      expect(targetLane).toBe(runner.lane);
    });

    it("does not shift to rail in early race (progress < 0.5)", () => {
      const runner = createMockRunner({ runningStyle: "S", lane: 1.2 });
      const targetLane = calculateRailSavingLane(runner, 0.3);
      expect(targetLane).toBe(runner.lane);
    });

    it("respects railPreference when set to 0 (already on rail)", () => {
      const runner = createMockRunner({ runningStyle: "S", lane: 0, railPreference: 0 });
      const targetLane = calculateRailSavingLane(runner, 0.8);
      expect(targetLane).toBe(0);
    });
  });

  describe("calculateCoverModifier", () => {
    it("returns 0.99 (conserve) when ≥2 horses ahead within 5m in same lane", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const ahead1 = createMockRunner({ horseId: "h2", position: 103, lane: 1.2 });
      const ahead2 = createMockRunner({ horseId: "h3", position: 104, lane: 1.2 });
      const sortedField = [ahead1, ahead2, runner];
      const mod = calculateCoverModifier(runner, sortedField);
      expect(mod).toBeCloseTo(0.99, 5);
    });

    it("returns 1.01 (improve) when no horses ahead within 5m", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const farAhead = createMockRunner({ horseId: "h2", position: 110, lane: 1.2 });
      const sortedField = [farAhead, runner];
      const mod = calculateCoverModifier(runner, sortedField);
      expect(mod).toBeCloseTo(1.01, 5);
    });

    it("returns 1.0 when exactly 1 horse ahead within 5m (neutral)", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const ahead = createMockRunner({ horseId: "h2", position: 103, lane: 1.2 });
      const sortedField = [ahead, runner];
      const mod = calculateCoverModifier(runner, sortedField);
      expect(mod).toBeCloseTo(1.0, 5);
    });

    it("only counts horses in the same lane (gap < 0.5)", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const ahead1 = createMockRunner({ horseId: "h2", position: 103, lane: 2.4 });
      const ahead2 = createMockRunner({ horseId: "h3", position: 104, lane: 2.4 });
      const sortedField = [ahead1, ahead2, runner];
      const mod = calculateCoverModifier(runner, sortedField);
      expect(mod).toBeCloseTo(1.01, 5);
    });

    it("ignores finished runners", () => {
      const runner = createMockRunner({ horseId: "h1", position: 100, lane: 1.2 });
      const ahead1 = createMockRunner({
        horseId: "h2",
        position: 103,
        lane: 1.2,
        finishTime: 120.5,
      });
      const ahead2 = createMockRunner({ horseId: "h3", position: 104, lane: 1.2 });
      const sortedField = [ahead1, ahead2, runner];
      const mod = calculateCoverModifier(runner, sortedField);
      expect(mod).toBeCloseTo(1.0, 5);
    });
  });
});
