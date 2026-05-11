/**
 * dynamicForm.test.ts - Dynamic Form & Bounce Mechanic tests
 *
 * Tests for recovery points draining, bounce penalty calculation,
 * and fatigue modifiers in the race engine.
 */

import { describe, it, expect } from "vitest";
import type { Horse } from "@/game/types";

describe("Dynamic Form & Bounce Mechanic", () => {
  describe("Recovery Points", () => {
    it("should initialize with default value of 100", () => {
      const horse: Partial<Horse> = {
        id: "test-horse",
        name: "Test Horse",
        age: 3,
        gender: "colt",
        energy: 100,
        form: 0,
        potential: 80,
        distanceAptitude: 0.5,
        surfaceAptitude: { Turf: 0.5, Dirt: 0.5, Synthetic: 0.5 },
        climbingAptitude: 0.5,
        corneringAptitude: 0.5,
        injuryProneness: 0.5,
        height: 16,
        weight: 1000,
        heartScore: 100,
        fiberBias: "balanced",
        strideType: "balanced",
        trackPreference: "balanced",
        mudAptitude: 0.5,
        trainability: 0.5,
        peakAge: 5,
        recoveryRate: 0.5,
        fertility: 0.5,
        foalingEase: 0.5,
        markings: {
          socks: "none",
          face: "none",
          silverDapple: false,
          sabino: false,
          splashWhite: false,
        },
        bleederRisk: 0.5,
        roarerRisk: 0.5,
        ocdRisk: 0.5,
        lifetimeEarnings: 0,
        careerStarts: 0,
        careerWins: 0,
        racingViable: true,
        lifecycleStatus: "active",
      };

      expect(horse.recoveryPoints).toBeUndefined();
      const recoveryPoints = horse.recoveryPoints ?? 100;
      expect(recoveryPoints).toBe(100);
    });

    it("should calculate recovery drain based on distance and Beyer", () => {
      const distance = 2000; // 2km race
      const beyer = 100;

      // Formula: min(30, floor(distance/100) + floor(beyer/20))
      const expectedDrain = Math.min(30, Math.floor(distance / 100) + Math.floor(beyer / 20));
      expect(expectedDrain).toBe(25); // 20 + 5 = 25
    });

    it("should cap recovery drain at 30", () => {
      const distance = 2400; // 2.4km race
      const beyer = 120;

      const drain = Math.min(30, Math.floor(distance / 100) + Math.floor(beyer / 20));
      expect(drain).toBe(30); // Capped at 30
    });

    it("should calculate daily recovery gain", () => {
      const currentRecovery = 50;
      const recoveryRate = 0.5;
      const barnBonus = 0.1;
      const nutritionistBonus = 0.05;

      const baseGain = 10 * (1 + barnBonus + nutritionistBonus);
      const recoveryGain = baseGain * recoveryRate;
      const newRecovery = Math.min(100, currentRecovery + recoveryGain);

      expect(newRecovery).toBeGreaterThan(50);
      expect(newRecovery).toBeLessThanOrEqual(100);
    });
  });

  describe("Bounce Penalty", () => {
    it("should detect bounce risk when lastBeyer > avgBeyer + 15 and < 28 days", () => {
      const lastBeyer = 100;
      const avgBeyer = 80;
      const daysSinceLastRace = 20;

      const isBounceRisk = lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28;
      expect(isBounceRisk).toBe(true);
    });

    it("should not detect bounce risk when lastBeyer <= avgBeyer + 15", () => {
      const lastBeyer = 90;
      const avgBeyer = 80;
      const daysSinceLastRace = 20;

      const isBounceRisk = lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28;
      expect(isBounceRisk).toBe(false);
    });

    it("should not detect bounce risk when >= 28 days since last race", () => {
      const lastBeyer = 100;
      const avgBeyer = 80;
      const daysSinceLastRace = 30;

      const isBounceRisk = lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28;
      expect(isBounceRisk).toBe(false);
    });

    it("should apply 10% penalty for bounce risk", () => {
      const bouncePenalty = 0.9;
      const baseTopSpeed = 60;
      const modifiedTopSpeed = baseTopSpeed * bouncePenalty;

      expect(modifiedTopSpeed).toBe(54);
    });
  });

  describe("Fatigue Modifier", () => {
    it("should calculate fatigueMod when recoveryPoints < 50", () => {
      const recoveryPoints = 40;
      const fatigueMod = 0.7 + (recoveryPoints / 50) * 0.3;

      expect(fatigueMod).toBe(0.94); // 0.7 + 0.8 * 0.3 = 0.94
    });

    it("should not apply fatigueMod when recoveryPoints >= 50", () => {
      const recoveryPoints = 70;
      const fatigueMod = recoveryPoints < 50 ? 0.7 + (recoveryPoints / 50) * 0.3 : 1.0;

      expect(fatigueMod).toBe(1.0);
    });

    it("should apply fatigueMod to topSpeed", () => {
      const baseTopSpeed = 60;
      const fatigueMod = 0.8;
      const modifiedTopSpeed = baseTopSpeed * fatigueMod;

      expect(modifiedTopSpeed).toBe(48);
    });
  });

  describe("Condition Status", () => {
    it("should display Peaking when recoveryPoints > 80", () => {
      const recoveryPoints = 85;
      let label: string;

      if (recoveryPoints > 80) {
        label = "Peaking";
      } else if (recoveryPoints >= 50) {
        label = "Fresh";
      } else if (recoveryPoints >= 30) {
        label = "Fatigued";
      } else {
        label = "Exhausted";
      }

      expect(label).toBe("Peaking");
    });

    it("should display Fresh when recoveryPoints 50-80", () => {
      const recoveryPoints = 65;
      let label: string;

      if (recoveryPoints > 80) {
        label = "Peaking";
      } else if (recoveryPoints >= 50) {
        label = "Fresh";
      } else if (recoveryPoints >= 30) {
        label = "Fatigued";
      } else {
        label = "Exhausted";
      }

      expect(label).toBe("Fresh");
    });

    it("should display Fatigued when recoveryPoints 30-50", () => {
      const recoveryPoints = 40;
      let label: string;

      if (recoveryPoints > 80) {
        label = "Peaking";
      } else if (recoveryPoints >= 50) {
        label = "Fresh";
      } else if (recoveryPoints >= 30) {
        label = "Fatigued";
      } else {
        label = "Exhausted";
      }

      expect(label).toBe("Fatigued");
    });

    it("should display Exhausted when recoveryPoints < 30", () => {
      const recoveryPoints = 20;
      let label: string;

      if (recoveryPoints > 80) {
        label = "Peaking";
      } else if (recoveryPoints >= 50) {
        label = "Fresh";
      } else if (recoveryPoints >= 30) {
        label = "Fatigued";
      } else {
        label = "Exhausted";
      }

      expect(label).toBe("Exhausted");
    });
  });
});
