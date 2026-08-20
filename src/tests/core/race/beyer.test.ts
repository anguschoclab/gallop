import { describe, it, expect } from "vitest";
import {
  distanceBucket,
  parTime,
  beyerFigure,
  expectedBeyer,
  detectPatternJump,
  calculateBeyerForResult,
} from "@/core/race/beyer";
import { createTestHorse } from "@/tests/helpers";
import type { CourseSpecification, TrackSection } from "@/data/tracks";
import { BEYER_MIN, BEYER_MAX, BEYER_BASE } from "@/constants/gameConstants";

describe("beyer.ts", () => {
  describe("distanceBucket", () => {
    it("rounds to nearest 200m and enforces minimum 200", () => {
      expect(distanceBucket(100)).toBe(200);
      expect(distanceBucket(1099)).toBe(1000);
      expect(distanceBucket(1100)).toBe(1200); // 1100 / 200 = 5.5. Math.round(5.5) = 6. 6 * 200 = 1200
      expect(distanceBucket(900)).toBe(1000);
    });
  });

  describe("parTime", () => {
    it("falls back to analytical default if no calibrated pars", () => {
      // 1000m / 16.7 = 59.88s
      expect(parTime(1000)).toBeCloseTo(1000 / 16.7);
    });

    it("uses exact calibrated par if available", () => {
      const calibrated = { 1000: 60 };
      expect(parTime(1000, calibrated)).toBe(60);

      // Scaling: 900m falls in bucket 1000
      expect(parTime(900, calibrated)).toBe(60 * (900 / 1000));
    });

    it("interpolates using neighbors if exact bucket is missing", () => {
      const calibrated = { 800: 48, 1200: 72 };
      // 1000m -> bucket 1000. Missing. Neighbors: 800 and 1200.
      // Avg: (48 + 72) / 2 = 60.
      // Result: 60 * (1000 / 1000) = 60.
      expect(parTime(1000, calibrated)).toBe(60);
    });
  });

  describe("beyerFigure & calculateBeyerForResult", () => {
    it("handles zero or negative finish time gracefully", () => {
      expect(beyerFigure({ distance: 1000, finishTime: 0 })).toBe(0);
      expect(beyerFigure({ distance: 1000, finishTime: -10 })).toBe(0);
      expect(beyerFigure({ distance: 1000, finishTime: NaN })).toBe(0);
    });

    it("clamps output to BEYER_MIN and BEYER_MAX", () => {
      // Very slow
      expect(beyerFigure({ distance: 1000, finishTime: 9999 })).toBe(BEYER_MIN);
      // Very fast
      expect(beyerFigure({ distance: 1000, finishTime: 1 })).toBe(BEYER_MAX);
    });

    it("calculates expected figure with classBonus", () => {
      const par = parTime(1000);
      const finishTime = par; // par = 0 delta = base
      expect(beyerFigure({ distance: 1000, finishTime })).toBe(BEYER_BASE);
      expect(beyerFigure({ distance: 1000, finishTime, classBonus: 5 })).toBe(BEYER_BASE + 5);

      // calculateBeyerForResult wrapper
      expect(calculateBeyerForResult(1000, finishTime, 5)).toBe(BEYER_BASE + 5);
    });
  });

  describe("expectedBeyer", () => {
    it("estimates beyer using horse stats and form", () => {
      const horse = createTestHorse({
        stats: {
          speed: 80,
          stamina: 80,
          acceleration: 80,
          consistency: 80,
          temperament: 50,
          conformation: 50,
        },
        form: 10,
        energy: 100,
      });
      const result = expectedBeyer(horse, 1000);
      expect(result).toBeGreaterThan(BEYER_MIN);
      expect(result).toBeLessThanOrEqual(BEYER_MAX);
    });

    it("applies complexity penalties for tight turns and steep gradients", () => {
      const horse = createTestHorse({
        stats: {
          speed: 50,
          stamina: 50,
          acceleration: 50,
          consistency: 50,
          temperament: 50,
          conformation: 50,
        },
        corneringAptitude: 0.1, // Poor aptitude ensures penalty applies fully
        climbingAptitude: 0.1,
        form: 0,
        energy: 100,
      });

      // Avoid straight-only course, as the empty turns filter produces avgRadius 0, penalizing it.
      const simpleCourse: CourseSpecification = {
        surface: "Dirt",
        circumference: 1000,
        straightLength: 500,
        sections: [
          { type: "turn", length: 500, radius: 400 },
          { type: "straight", length: 500, gradient: 0 },
        ],
      };

      const complexCourse: CourseSpecification = {
        surface: "Dirt",
        circumference: 1000,
        straightLength: 500,
        sections: [
          { type: "turn", length: 500, radius: 100 },
          { type: "straight", length: 500, gradient: 5 },
        ],
      };

      const simpleBeyer = expectedBeyer(horse, 1000, 0, simpleCourse, {});
      const complexBeyer = expectedBeyer(horse, 1000, 0, complexCourse, {});

      expect(complexBeyer).toBeLessThan(simpleBeyer);
    });
  });

  describe("detectPatternJump", () => {
    it("returns false with 0 margin if history is empty", () => {
      const horse = createTestHorse({ raceHistory: [] });
      expect(detectPatternJump(horse, 100)).toEqual({ jumped: false, margin: 0 });
    });

    it("returns false if new beyer does not meet jump thresholds", () => {
      const horse = createTestHorse();
      horse.raceHistory = [{ beyer: 80 }, { beyer: 82 }] as any;
      expect(detectPatternJump(horse, 85)).toEqual({ jumped: false, margin: 0 });
    });

    it("returns true if new beyer jumps over average threshold", () => {
      const horse = createTestHorse();
      horse.raceHistory = [{ beyer: 80 }, { beyer: 80 }] as any;
      // Avg 80. Jump threshold = 15 -> 95.
      const margin = 95 - 80;
      expect(detectPatternJump(horse, 95)).toEqual({ jumped: true, margin });
    });

    it("returns true if new beyer jumps over best threshold (requires history >= 2)", () => {
      const horse = createTestHorse();
      horse.raceHistory = [
        { beyer: 80 }, // Avg 90, Best 100
        { beyer: 100 },
      ] as any;
      // Avg 90. Jump avg threshold = 90 + 15 = 105.
      // Best 100. Jump best threshold = 100 + 10 = 110.
      expect(detectPatternJump(horse, 110)).toEqual({ jumped: true, margin: 20 }); // jump over avg is 20, jump over best is 10. Max is 20.
    });

    it("ignores history without beyer values", () => {
      const horse = createTestHorse();
      horse.raceHistory = [{ beyer: undefined }, { beyer: undefined }] as any;
      expect(detectPatternJump(horse, 100)).toEqual({ jumped: false, margin: 0 });
    });
  });
});
