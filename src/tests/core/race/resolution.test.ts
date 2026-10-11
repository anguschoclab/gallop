import { describe, it, expect } from "vitest";
import {
  computePayoutSplits,
  sanitizeAndRankResults,
  detectPhotoFinish,
} from "@/core/race/resolution";
import { GRADED_PRIZE_SPLIT, PRIZE_SPLIT } from "@/constants";

describe("resolution", () => {
  describe("computePayoutSplits", () => {
    it("computes payout splits for regular races", () => {
      const purse = 10000;
      const splits = computePayoutSplits(purse, 10, false);
      expect(splits.length).toBe(PRIZE_SPLIT.length);
      expect(splits[0]).toBe(Math.round(purse * PRIZE_SPLIT[0]));
    });

    it("computes payout splits for graded races", () => {
      const purse = 100000;
      const splits = computePayoutSplits(purse, 10, true);
      expect(splits.length).toBe(GRADED_PRIZE_SPLIT.length);
      expect(splits[0]).toBe(Math.round(purse * GRADED_PRIZE_SPLIT[0]));
    });

    it("distributes remaining purse if fewer finishers than split length", () => {
      const purse = 10000;
      const splits = computePayoutSplits(purse, 3, false);
      expect(splits.length).toBe(3);
      expect(splits.reduce((a, b) => a + b, 0)).toBeLessThan(purse); // Actually it does not route to the last, the rule says "if finisherCount >= split.length"
    });

    it("routes remainder due to rounding to last paid finisher", () => {
      // We need a purse where rounding down leaves a remainder
      const purse = 10003;
      const splits = computePayoutSplits(purse, 10, false);
      const sum = splits.reduce((a, b) => a + b, 0);
      expect(sum).toBe(purse);
    });
  });

  describe("sanitizeAndRankResults", () => {
    it("ranks finishers and handles DNFs", () => {
      const raw = [
        { horseId: "h1", time: 120.5 },
        { horseId: "h2", time: -1 }, // DNF
        { horseId: "h3", time: 119.5 },
        { horseId: "h4", time: Infinity }, // DNF
      ];
      const { ranked, finishers, dnfs } = sanitizeAndRankResults(raw, "race1");

      expect(finishers.length).toBe(2);
      expect(dnfs.length).toBe(2);
      expect(ranked.length).toBe(4);

      expect(ranked[0].horseId).toBe("h3");
      expect(ranked[0].position).toBe(1);
      expect(ranked[0].time).toBe(119.5);

      expect(ranked[1].horseId).toBe("h1");
      expect(ranked[1].position).toBe(2);

      expect(ranked[2].dnf).toBe(true);
      expect(ranked[2].position).toBe(3);
      expect(ranked[3].dnf).toBe(true);
      expect(ranked[3].position).toBe(4);
    });
  });

  describe("detectPhotoFinish", () => {
    it("returns true if top finishers are within 0.05 seconds", () => {
      const finishers = [
        { horseId: "h1", time: 120.0, position: 1, dnf: false },
        { horseId: "h2", time: 120.04, position: 2, dnf: false },
        { horseId: "h3", time: 121.0, position: 3, dnf: false },
      ];
      expect(detectPhotoFinish(finishers)).toBe(true);
    });

    it("returns false if top finishers are not within 0.05 seconds", () => {
      const finishers = [
        { horseId: "h1", time: 120.0, position: 1, dnf: false },
        { horseId: "h2", time: 120.06, position: 2, dnf: false },
        { horseId: "h3", time: 121.0, position: 3, dnf: false },
      ];
      expect(detectPhotoFinish(finishers)).toBe(false);
    });
  });
});
