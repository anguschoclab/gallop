import { describe, it, expect } from "vitest";
import { calculateTrackGeometryModifiers } from "@/domains/race/simulation/engine/trackGeometryModifiers";
import type { Runner } from "@/domains/race/simulation/engine/runnerBuilder";
import type { CourseSpecification } from "@/shared/data/accessors/tracksAccessor";
import { SURFACE_SPECIALIST_SPEED_BONUS } from "@/domains/race/model/engine/constants";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    velocity: 15,
    lane: 0,
    horse: {
      stats: { acceleration: 50 },
      climbingAptitude: 1.0,
      corneringAptitude: 1.0,
    },
    jockey: {
      stats: { positioning: 50 },
      traits: [],
    },
    ...overrides,
  } as unknown as Runner;
}

const flatStraightCourse: CourseSpecification = {
  surface: "Turf",
  circumference: 1600,
  sections: [{ type: "straight", length: 1600, gradient: 0 }],
} as CourseSpecification;

const uphillStraightCourse: CourseSpecification = {
  surface: "Turf",
  circumference: 1600,
  sections: [{ type: "straight", length: 1600, gradient: 2 }],
} as CourseSpecification;

const turnCourse: CourseSpecification = {
  surface: "Dirt",
  circumference: 1600,
  sections: [{ type: "turn", length: 1600, radius: 100, gradient: 0 }],
} as CourseSpecification;

describe("calculateTrackGeometryModifiers", () => {
  describe("Gradient Modifiers", () => {
    it("applies no penalty on a flat course", () => {
      const runner = makeRunner();
      const modifiers = calculateTrackGeometryModifiers(runner, flatStraightCourse.sections?.[0] ?? null, flatStraightCourse.surface);
      expect(modifiers.gradientSpeedMul).toBe(1.0);
      expect(modifiers.gradientStaminaMul).toBe(1.0);
    });

    it("applies penalty on an uphill course", () => {
      const runner = makeRunner();
      const modifiers = calculateTrackGeometryModifiers(runner, uphillStraightCourse.sections?.[0] ?? null, uphillStraightCourse.surface);
      expect(modifiers.gradientSpeedMul).toBe(1 - 2 / 100);
      expect(modifiers.gradientStaminaMul).toBe(1 - 2 / 200);
    });

    it("reduces penalty for good climbers on uphill course", () => {
      const runner = makeRunner({
        horse: {
          climbingAptitude: 2.0,
          stats: { acceleration: 50 },
          corneringAptitude: 1.0,
        } as any,
      });
      const modifiers = calculateTrackGeometryModifiers(runner, uphillStraightCourse.sections?.[0] ?? null, uphillStraightCourse.surface);
      expect(modifiers.gradientStaminaMul).toBe(1 - 2 / (200 * 2.0));
    });

    it("further reduces penalty for hill_specialist trait", () => {
      const runner = makeRunner({
        jockey: { stats: { positioning: 50 }, traits: ["hill_specialist"] } as any,
      });
      const modifiers = calculateTrackGeometryModifiers(runner, uphillStraightCourse.sections?.[0] ?? null, uphillStraightCourse.surface);
      expect(modifiers.gradientStaminaMul).toBe(1 - 2 / (400 * 1.0));
    });
  });

  describe("Turn and Arc Modifiers", () => {
    it("returns infinite radius and arc factor 1 on straight", () => {
      const runner = makeRunner({ lane: 2 });
      const modifiers = calculateTrackGeometryModifiers(runner, flatStraightCourse.sections?.[0] ?? null, flatStraightCourse.surface);
      expect(modifiers.radius).toBe(Infinity);
      expect(modifiers.arcFactor).toBe(1.0);
      expect(modifiers.turnSpeedMul).toBe(1.0);
    });

    it("calculates arc factor based on lane and radius on turns", () => {
      const runner = makeRunner({ lane: 2 });
      const modifiers = calculateTrackGeometryModifiers(runner, turnCourse.sections?.[0] ?? null, turnCourse.surface);
      expect(modifiers.radius).toBe(100);
      expect(modifiers.arcFactor).toBe(1 + 2 / 100);
    });

    it("applies turn speed penalty based on centrifugal pressure", () => {
      const runner = makeRunner({
        velocity: 30,
        jockey: { stats: { positioning: 0 }, traits: [] } as any,
      }); // Low positioning skill to ensure penalty applies
      const modifiers = calculateTrackGeometryModifiers(runner, turnCourse.sections?.[0] ?? null, turnCourse.surface);
      expect(modifiers.turnSpeedMul).toBeLessThan(1.0);
    });

    it("mitigates turn penalty with bullring_expert trait", () => {
      const runnerNormal = makeRunner({
        velocity: 25,
        jockey: { stats: { positioning: 0 }, traits: [] } as any,
      }); // Velocity 25 gives pressure 0.625. Normal penalty is 0.625 - 0.3 = 0.325.
      const runnerExpert = makeRunner({
        velocity: 25,
        jockey: { stats: { positioning: 0 }, traits: ["bullring_expert"] } as any,
      });

      const modsNormal = calculateTrackGeometryModifiers(runnerNormal, turnCourse.sections?.[0] ?? null, turnCourse.surface);
      const modsExpert = calculateTrackGeometryModifiers(runnerExpert, turnCourse.sections?.[0] ?? null, turnCourse.surface);

      expect(modsExpert.turnSpeedMul).toBeGreaterThan(modsNormal.turnSpeedMul);
    });
  });

  describe("Surface Modifiers", () => {
    it("applies turf specialist bonus", () => {
      const runner = makeRunner({
        jockey: { stats: { positioning: 50 }, traits: ["turf_specialist"] } as any,
      });
      const modifiers = calculateTrackGeometryModifiers(runner, flatStraightCourse.sections?.[0] ?? null, flatStraightCourse.surface);
      expect(modifiers.traitSurfaceMul).toBe(1 + SURFACE_SPECIALIST_SPEED_BONUS);
    });

    it("applies dirt specialist bonus", () => {
      const runner = makeRunner({
        jockey: { stats: { positioning: 50 }, traits: ["dirt_specialist"] } as any,
      });
      const modifiers = calculateTrackGeometryModifiers(runner, turnCourse.sections?.[0] ?? null, turnCourse.surface);
      expect(modifiers.traitSurfaceMul).toBe(1 + SURFACE_SPECIALIST_SPEED_BONUS);
    });

    it("applies no bonus for mismatched surface or missing traits", () => {
      const runner = makeRunner({
        jockey: { stats: { positioning: 50 }, traits: ["dirt_specialist"] } as any,
      });
      const modifiers = calculateTrackGeometryModifiers(runner, flatStraightCourse.sections?.[0] ?? null, flatStraightCourse.surface); // Turf course
      expect(modifiers.traitSurfaceMul).toBe(1.0);
    });
  });
});
