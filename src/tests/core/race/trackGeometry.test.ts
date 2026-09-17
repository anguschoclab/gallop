import { describe, it, expect } from "vitest";
import { calculateTrackGeometryScore, calculateGradientScore } from "@/core/race/trackGeometry";
import type { Horse, Race } from "@/game/types";

describe("trackGeometry", () => {
  describe("calculateTrackGeometryScore", () => {
    it("returns 0 for graded tracks (straight = 400, unreachable branch > 450)", () => {
      // Graded tracks get straight = 400 in the simplified heuristic, so we can't trigger > 450 here directly
      // without modifying production. straight is hardcoded as: `const straight = race.graded ? 400 : 350;`
      // It means it will never hit `straight > 450` or `straight < 350` in the current simplified logic.
      // Let's document this current behavior.

      const horse = { stats: { speed: 100, acceleration: 100 }, corneringAptitude: 2.0 } as Horse;
      const gradedRace = { graded: { trackId: "graded-track" } } as Race;

      // Both branches (straight > 450 and straight < 350) are unreachable with the hardcoded values (400 and 350).
      // Thus score is always 0.
      expect(calculateTrackGeometryScore(horse, gradedRace)).toBe(0);
    });

    it("returns 0 for non-graded tracks (straight = 350, unreachable branch < 350)", () => {
      const horse = { stats: { speed: 100, acceleration: 100 }, corneringAptitude: 2.0 } as Horse;
      const ungradedRace = { trackId: "ungraded-track" } as Race;

      expect(calculateTrackGeometryScore(horse, ungradedRace)).toBe(0);
    });
  });

  describe("calculateGradientScore", () => {
    it("awards bonus for good climbers on hilly tracks", () => {
      const horse = { climbingAptitude: 1.1 } as Horse;
      const ascotRace = { graded: { track: "Royal Ascot" } } as Race;
      expect(calculateGradientScore(horse, ascotRace)).toBe(20);

      const nakayamaRace = { graded: { track: "Nakayama" } } as Race;
      expect(calculateGradientScore(horse, nakayamaRace)).toBe(20);
    });

    it("applies penalty for poor climbers on hilly tracks", () => {
      const horse = { climbingAptitude: 0.9 } as Horse;
      const ascotRace = { graded: { track: "Ascot" } } as Race;
      expect(calculateGradientScore(horse, ascotRace)).toBe(-20);
    });

    it("returns 0 for flat tracks or missing track info", () => {
      const horse = { climbingAptitude: 1.1 } as Horse;

      const flatRace = { graded: { track: "Churchill Downs" } } as Race;
      expect(calculateGradientScore(horse, flatRace)).toBe(0);

      const missingInfoRace = {} as Race;
      expect(calculateGradientScore(horse, missingInfoRace)).toBe(0);
    });

    it("handles undefined graded object gracefully", () => {
      const horse = { climbingAptitude: 1.1 } as Horse;
      const ungradedRace = { trackId: "ungraded-1" } as Race;
      expect(calculateGradientScore(horse, ungradedRace)).toBe(0);
    });
  });
});
