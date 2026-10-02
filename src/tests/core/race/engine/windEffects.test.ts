import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateWindEffect } from "@/core/race/engine/windEffects";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { CourseSpecification, TrackSection } from "@/core/data/tracksAccessor";
import {
  WIND_EFFECT_SCALE,
  SPRINTER_WIND_MULTIPLIER,
  MIN_WIND_SPEED_MOD,
  MAX_WIND_SPEED_MOD,
  HEADWIND_STAMINA_PENALTY,
  TAILWIND_STAMINA_RELIEF,
  LONG_STRAIGHT_THRESHOLD,
} from "@/core/race/engine/constants";
import * as trackGeometry from "@/core/race/engine/trackGeometry";

describe("calculateWindEffect", () => {
  const mockRunner: Runner = {
    horseId: "h1",
    name: "Test Runner",
    silk: "",
    isPlayer: false,
    position: 0,
    velocity: 15,
    finishTime: null,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 16,
    accel: 5,
    staminaFactor: 0.7,
    noise: 0.5,
    affinityBonus: 0,
    runningStyle: "P",
    draftingHorseId: null,
    weight: 55,
    horse: { bleederRisk: 0, roarerRisk: 0, id: "h1" } as any,
  };

  const mockSprinter: Runner = {
    ...mockRunner,
    topSpeed: 19, // > 18 is sprinter
  };

  const mockCourse: CourseSpecification = {
    name: "Test Course",
    surface: "Turf",
    circumference: 1600,
    straightLength: 600, // > LONG_STRAIGHT_THRESHOLD (500)
    sections: [],
  };

  const mockSection: TrackSection = {
    type: "straight",
    length: 600,
  };

  const mockGetSectionOrientation = vi.spyOn(trackGeometry, "getSectionOrientation");

  beforeEach(() => {
    mockGetSectionOrientation.mockClear();
  });

  it("returns neutral mods if wind params are missing", () => {
    const result = calculateWindEffect(mockRunner, mockCourse, undefined, undefined, mockSection, 100);
    expect(result).toEqual({ speedMod: 1, staminaMod: 1 });
  });

  it("returns neutral mods if section is missing", () => {
    const result = calculateWindEffect(mockRunner, mockCourse, 20, 90, null, 100);
    expect(result).toEqual({ speedMod: 1, staminaMod: 1 });
  });

  it("returns neutral mods if section orientation is null", () => {
    mockGetSectionOrientation.mockReturnValue(null);
    const result = calculateWindEffect(mockRunner, mockCourse, 20, 90, mockSection, 100);
    expect(result).toEqual({ speedMod: 1, staminaMod: 1 });
  });

  describe("wind component calculations", () => {
    it("applies penalty for pure headwind (orientation = windDirection)", () => {
      // Runner goes at 90 deg, wind comes from 90 deg -> pure headwind
      mockGetSectionOrientation.mockReturnValue(90);
      const windKph = 20;

      const result = calculateWindEffect(mockRunner, mockCourse, windKph, 90, mockSection, 100);

      // windComponent = cos(0) = 1
      // speedMod = 1 - (20 / 1300) = 1 - 0.01538 = 0.9846
      // staminaMod = HEADWIND_STAMINA_PENALTY
      expect(result.speedMod).toBeCloseTo(1 - (windKph / WIND_EFFECT_SCALE), 4);
      expect(result.speedMod).toBeLessThan(1);
      expect(result.staminaMod).toBe(HEADWIND_STAMINA_PENALTY);
    });

    it("applies relief for pure tailwind (orientation vs windDirection = 180 deg)", () => {
      // Runner goes at 90 deg, wind comes from 270 deg -> pure tailwind
      mockGetSectionOrientation.mockReturnValue(90);
      const windKph = 20;

      const result = calculateWindEffect(mockRunner, mockCourse, windKph, 270, mockSection, 100);

      // windComponent = cos(180) = -1
      // speedMod = 1 - (20 / 1300) * -1 = 1 + 0.01538 = 1.0154
      expect(result.speedMod).toBeCloseTo(1 + (windKph / WIND_EFFECT_SCALE), 4);
      expect(result.speedMod).toBeGreaterThan(1);
      expect(result.staminaMod).toBe(TAILWIND_STAMINA_RELIEF);
    });

    it("applies neutral effect for crosswind (orientation vs windDirection = 90 deg)", () => {
      mockGetSectionOrientation.mockReturnValue(90);
      const windKph = 20;

      const result = calculateWindEffect(mockRunner, mockCourse, windKph, 0, mockSection, 100);

      // windComponent = cos(90) = 0
      expect(result.speedMod).toBeCloseTo(1, 4);
      expect(result.staminaMod).toBe(1);
    });
  });

  describe("sprinter conditions", () => {
    it("amplifies wind effect for sprinters on long straights", () => {
      mockGetSectionOrientation.mockReturnValue(90);
      const windKph = 20;

      // Pure headwind
      const result = calculateWindEffect(mockSprinter, mockCourse, windKph, 90, mockSection, 100);

      const baseEffect = windKph / WIND_EFFECT_SCALE;
      const expectedSpeedMod = 1 - (baseEffect * 1 * SPRINTER_WIND_MULTIPLIER);

      expect(result.speedMod).toBeCloseTo(expectedSpeedMod, 4);
      expect(result.speedMod).toBeLessThan(1 - baseEffect); // More penalty than non-sprinter
    });

    it("does not amplify for sprinters if straight is short", () => {
      mockGetSectionOrientation.mockReturnValue(90);
      const windKph = 20;
      const shortCourse = { ...mockCourse, straightLength: LONG_STRAIGHT_THRESHOLD - 100 };

      const result = calculateWindEffect(mockSprinter, shortCourse, windKph, 90, mockSection, 100);

      const expectedSpeedMod = 1 - (windKph / WIND_EFFECT_SCALE);
      expect(result.speedMod).toBeCloseTo(expectedSpeedMod, 4);
    });

    it("does not amplify for sprinters on turns", () => {
      mockGetSectionOrientation.mockReturnValue(90);
      const windKph = 20;
      const turnSection = { ...mockSection, type: "turn" as const };

      const result = calculateWindEffect(mockSprinter, mockCourse, windKph, 90, turnSection, 100);

      const expectedSpeedMod = 1 - (windKph / WIND_EFFECT_SCALE);
      expect(result.speedMod).toBeCloseTo(expectedSpeedMod, 4);
    });
  });

  describe("speed modification clamping", () => {
    it("clamps speedMod to MAX_WIND_SPEED_MOD", () => {
      mockGetSectionOrientation.mockReturnValue(90);
      // Extreme tailwind
      const extremeWindKph = 200;

      const result = calculateWindEffect(mockRunner, mockCourse, extremeWindKph, 270, mockSection, 100);

      expect(result.speedMod).toBe(MAX_WIND_SPEED_MOD);
    });

    it("clamps speedMod to MIN_WIND_SPEED_MOD", () => {
      mockGetSectionOrientation.mockReturnValue(90);
      // Extreme headwind
      const extremeWindKph = 200;

      const result = calculateWindEffect(mockRunner, mockCourse, extremeWindKph, 90, mockSection, 100);

      expect(result.speedMod).toBe(MIN_WIND_SPEED_MOD);
    });
  });
});
