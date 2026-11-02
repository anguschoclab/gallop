import { describe, it, expect } from "vitest";
import {
  interpolateTimeAtDistance,
  calculateSectionalSplits,
  derivePaceStyleLabel,
  buildPacePositionString,
  getCourseMultiplier,
} from "@/domains/race/simulation/sectionalAnalysis";
import type { RaceSnapshot } from "@/domains/race/model/engine/raceSnapshotTypes";

describe("sectionalAnalysis", () => {
  const snapshots: RaceSnapshot[] = [
    {
      t: 0,
      horses: [
        { horseId: "A", position: 0, seekContribution: 0, spurtContribution: 0 },
        { horseId: "B", position: 0, seekContribution: 0, spurtContribution: 0 },
      ],
    },
    {
      t: 10,
      horses: [
        { horseId: "A", position: 100, seekContribution: 1, spurtContribution: 2 },
        { horseId: "B", position: 90, seekContribution: 0, spurtContribution: 0 },
      ],
    },
    {
      t: 20,
      horses: [
        { horseId: "A", position: 200, seekContribution: 3, spurtContribution: 4 },
        { horseId: "B", position: 210, seekContribution: 0, spurtContribution: 0 },
      ],
    },
  ] as RaceSnapshot[];

  describe("interpolateTimeAtDistance", () => {
    it("interpolates time linearly", () => {
      expect(interpolateTimeAtDistance(snapshots, "A", 150)).toBe(15);
    });
  });

  describe("calculateSectionalSplits", () => {
    it("calculates splits for all markers", () => {
      const splits = calculateSectionalSplits(snapshots, 200, ["A"], [50, 150, 200]);
      expect(splits.length).toBe(3);
    });
  });

  describe("buildPacePositionString", () => {
    it("returns dashed string of ranks", () => {
      const splits = calculateSectionalSplits(snapshots, 200, ["A", "B"], [100, 200]);
      expect(buildPacePositionString(splits, "A")).toBe("1-2");
    });
  });

  describe("derivePaceStyleLabel", () => {
    it("classifies Wire-to-wire", () => {
      expect(derivePaceStyleLabel([1, 2, 4], 10)).toBe("Wire-to-wire");
    });

    it("classifies Presser", () => {
      expect(derivePaceStyleLabel([3, 2, 1], 10)).toBe("Presser");
    });

    it("classifies Closer", () => {
      expect(derivePaceStyleLabel([5, 3, 2], 10)).toBe("Closer");
    });

    it("classifies Deep Closer", () => {
      expect(derivePaceStyleLabel([6, 5, 2], 10)).toBe("Deep Closer");
      expect(derivePaceStyleLabel([9, 8, 2], 10)).toBe("Deep Closer");
    });
  });

  describe("getCourseMultiplier", () => {
    it("returns scaling multipliers for course familiarity", () => {
      expect(getCourseMultiplier(0)).toBe(0.985);
      expect(getCourseMultiplier(1)).toBe(0.995);
      expect(getCourseMultiplier(3)).toBe(1.0);
      expect(getCourseMultiplier(6)).toBe(1.005);
      expect(getCourseMultiplier(12)).toBe(1.01);
    });
  });
});
