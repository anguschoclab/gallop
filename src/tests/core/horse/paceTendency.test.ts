import { test, describe, expect } from "vitest";
import {
  classifyTendency,
  classifyDistanceBucket,
  getHorseTendencyStats,
  matchesTendency,
} from "@/core/horse/paceTendency";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";

describe("paceTendency", () => {
  describe("classifyDistanceBucket", () => {
    test("handles undefined", () => {
      expect(classifyDistanceBucket(undefined)).toBe("any");
    });
    test("sprints", () => {
      expect(classifyDistanceBucket(1000)).toBe("sprint");
      expect(classifyDistanceBucket(1400)).toBe("sprint");
    });
    test("miles", () => {
      expect(classifyDistanceBucket(1401)).toBe("mile");
      expect(classifyDistanceBucket(1900)).toBe("mile");
    });
    test("routes", () => {
      expect(classifyDistanceBucket(1901)).toBe("route");
      expect(classifyDistanceBucket(2400)).toBe("route");
    });
  });

  describe("classifyTendency", () => {
    test("standard field of 8", () => {
      expect(classifyTendency(1, 8)).toBe("front");
      expect(classifyTendency(2, 8)).toBe("front");
      expect(classifyTendency(3, 8)).toBe("mid");
      expect(classifyTendency(5, 8)).toBe("mid");
      expect(classifyTendency(6, 8)).toBe("off");
      expect(classifyTendency(8, 8)).toBe("off");
    });
    test("default field size is 8", () => {
      expect(classifyTendency(2)).toBe("front");
      expect(classifyTendency(5)).toBe("mid");
      expect(classifyTendency(6)).toBe("off");
    });
    test("small field of 4", () => {
      // max(2, 4*0.25=1) -> 2
      expect(classifyTendency(1, 4)).toBe("front");
      expect(classifyTendency(2, 4)).toBe("front");
      // max(5, 4*0.65=2.6) -> 5
      expect(classifyTendency(3, 4)).toBe("mid");
      expect(classifyTendency(4, 4)).toBe("mid");
      // Impossible to be "off" in a 4 horse field
    });
    test("large field of 20", () => {
      // max(2, 20*0.25=5) -> 5
      expect(classifyTendency(5, 20)).toBe("front");
      expect(classifyTendency(6, 20)).toBe("mid");
      // max(5, 20*0.65=13) -> 13
      expect(classifyTendency(13, 20)).toBe("mid");
      expect(classifyTendency(14, 20)).toBe("off");
    });
  });

  describe("getHorseTendencyStats", () => {
    test("empty history", () => {
      const h = createTestHorse({});
      const stats = getHorseTendencyStats(h);
      expect(stats.sample).toBe(0);
      expect(stats.dominant).toBeNull();
    });

    test("calculates tendencies and wins/itm correctly", () => {
      const h = createTestHorse({
        raceHistory: [
          { distance: 1200, surface: "Dirt", fieldSize: 8, pacePositions: [1], position: 1 }, // front, win
          { distance: 1600, surface: "Turf", fieldSize: 8, pacePositions: [4], position: 2 }, // mid, itm
          { distance: 2000, surface: "Dirt", fieldSize: 8, pacePositions: [7], position: 4 }, // off, nothing
          { distance: 1200, surface: "Turf", fieldSize: 8, pacePositions: [2], position: 3 }, // front, itm
        ] as unknown as Horse["raceHistory"],
      });

      const stats = getHorseTendencyStats(h);
      expect(stats.sample).toBe(4);
      expect(stats.counts).toEqual({ front: 2, mid: 1, off: 1 });
      expect(stats.wins).toEqual({ front: 1, mid: 0, off: 0 });
      expect(stats.itm).toEqual({ front: 2, mid: 1, off: 0 });
      expect(stats.dominant).toBe("front");
      expect(stats.dominantShare).toBe(0.5); // 2/4
    });

    test("filters by distance and surface", () => {
      const h = createTestHorse({
        raceHistory: [
          { distance: 1200, surface: "Dirt", fieldSize: 8, pacePositions: [1], position: 1 }, // front, sprint, dirt
          { distance: 1600, surface: "Turf", fieldSize: 8, pacePositions: [8], position: 2 }, // off, mile, turf
        ] as unknown as Horse["raceHistory"],
      });

      const sprintStats = getHorseTendencyStats(h, { distance: "sprint" });
      expect(sprintStats.sample).toBe(1);
      expect(sprintStats.dominant).toBe("front");

      const turfStats = getHorseTendencyStats(h, { surface: "Turf" });
      expect(turfStats.sample).toBe(1);
      expect(turfStats.dominant).toBe("off");

      const emptyStats = getHorseTendencyStats(h, { distance: "route" });
      expect(emptyStats.sample).toBe(0);
    });

    test("skips races without pacePositions", () => {
      const h = createTestHorse({
        raceHistory: [
          { distance: 1200, surface: "Dirt", fieldSize: 8, pacePositions: [], position: 1 },
        ] as unknown as Horse["raceHistory"],
      });
      expect(getHorseTendencyStats(h).sample).toBe(0);
    });

    test("breaks ties deterministically — front wins over mid when counts are equal", () => {
      const h = createTestHorse({
        raceHistory: [
          { distance: 1200, surface: "Dirt", fieldSize: 8, pacePositions: [1], position: 1 }, // front
          { distance: 1600, surface: "Turf", fieldSize: 8, pacePositions: [4], position: 2 }, // mid
        ] as unknown as Horse["raceHistory"],
      });
      const stats = getHorseTendencyStats(h);
      expect(stats.counts).toEqual({ front: 1, mid: 1, off: 0 });
      expect(stats.dominant).toBe("front");
    });

    test("breaks ties deterministically — mid wins over off when counts are equal", () => {
      const h = createTestHorse({
        raceHistory: [
          { distance: 1600, surface: "Turf", fieldSize: 8, pacePositions: [4], position: 2 }, // mid
          { distance: 2000, surface: "Dirt", fieldSize: 8, pacePositions: [7], position: 4 }, // off
        ] as unknown as Horse["raceHistory"],
      });
      const stats = getHorseTendencyStats(h);
      expect(stats.counts).toEqual({ front: 0, mid: 1, off: 1 });
      expect(stats.dominant).toBe("mid");
    });

    test("breaks ties deterministically — front wins over off when counts are equal", () => {
      const h = createTestHorse({
        raceHistory: [
          { distance: 1200, surface: "Dirt", fieldSize: 8, pacePositions: [1], position: 1 }, // front
          { distance: 2000, surface: "Dirt", fieldSize: 8, pacePositions: [7], position: 4 }, // off
        ] as unknown as Horse["raceHistory"],
      });
      const stats = getHorseTendencyStats(h);
      expect(stats.counts).toEqual({ front: 1, mid: 0, off: 1 });
      expect(stats.dominant).toBe("front");
    });

    test("breaks three-way tie — front wins when all counts are equal", () => {
      const h = createTestHorse({
        raceHistory: [
          { distance: 1200, surface: "Dirt", fieldSize: 8, pacePositions: [1], position: 1 }, // front
          { distance: 1600, surface: "Turf", fieldSize: 8, pacePositions: [4], position: 2 }, // mid
          { distance: 2000, surface: "Dirt", fieldSize: 8, pacePositions: [7], position: 4 }, // off
        ] as unknown as Horse["raceHistory"],
      });
      const stats = getHorseTendencyStats(h);
      expect(stats.counts).toEqual({ front: 1, mid: 1, off: 1 });
      expect(stats.dominant).toBe("front");
    });
  });

  describe("matchesTendency", () => {
    test("always matches 'any'", () => {
      const h = createTestHorse({});
      expect(matchesTendency(h, "any")).toBe(true);
    });

    test("uses genetic runningStyle if no race history", () => {
      const frontE = createTestHorse({ runningStyle: "E" });
      const frontEP = createTestHorse({ runningStyle: "EP" });
      const mid = createTestHorse({ runningStyle: "P" });
      const off = createTestHorse({ runningStyle: "S" });

      expect(matchesTendency(frontE, "front")).toBe(true);
      expect(matchesTendency(frontEP, "front")).toBe(true);
      expect(matchesTendency(mid, "mid")).toBe(true);
      expect(matchesTendency(off, "off")).toBe(true);

      expect(matchesTendency(off, "front")).toBe(false);
    });

    test("overrides genetic runningStyle with actual race history", () => {
      // Genetic is "off" pace, but race history is purely "front"
      const h = createTestHorse({
        runningStyle: "S",
        raceHistory: [
          { distance: 1200, surface: "Dirt", fieldSize: 8, pacePositions: [1], position: 1 },
        ] as unknown as Horse["raceHistory"],
      });

      expect(matchesTendency(h, "front")).toBe(true);
      expect(matchesTendency(h, "off")).toBe(false);
    });
  });
});
