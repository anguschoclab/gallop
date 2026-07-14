import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clearLineageCache,
  getFoalsBy,
  getFoalsOf,
  isStakesWinner,
  isG1Winner,
  getStakesFoalsBy,
  getG1FoalsBy,
  foalLifetimeEarnings,
  totalEarningsBy,
  getRunnersBy,
} from "@/core/breeding/lineage";
import { createTestHorse } from "@/tests/helpers";
import { PRIZE_SPLIT, GRADED_PRIZE_SPLIT } from "@/constants";
import type { GameState } from "@/game/types";

describe("breeding lineage utils", () => {
  beforeEach(() => {
    clearLineageCache();
  });

  afterEach(() => {
    clearLineageCache();
  });

  const sireId = "sire-1";
  const damId = "dam-1";

  const foal1 = createTestHorse({
    id: "f1",
    age: 3,
    pedigree: { sireId, sireName: "Sire", damId, damName: "Dam", name: "F1", generation: 1 },
    raceHistory: [
      {
        raceId: "r1",
        raceName: "Derby",
        day: 10,
        position: 1,
        grade: "G1",
        purse: 100000,
        purseEarned: 100000 * PRIZE_SPLIT[0],
      },
    ],
  });

  const foal2 = createTestHorse({
    id: "f2",
    age: 1, // yearling
    pedigree: { sireId, sireName: "Sire", damId: "other-dam", damName: "Dam2", name: "F2", generation: 1 },
    raceHistory: [], // no races yet
  });

  const foal3 = createTestHorse({
    id: "f3",
    age: 4,
    pedigree: { sireId: "other-sire", sireName: "Sire2", damId, damName: "Dam", name: "F3", generation: 1 },
    raceHistory: [
      {
        raceId: "r2",
        raceName: "Allowance",
        day: 10,
        position: 1,
        purse: 20000,
        purseEarned: 20000 * PRIZE_SPLIT[0],
      },
    ],
  });

  const gameState: Pick<GameState, "horses"> = {
    horses: Object.fromEntries([foal1, foal2, foal3].map((h) => [h.id, h])),
  };

  describe("getFoalsBy and getFoalsOf", () => {
    it("should return foals matching sireId", () => {
      const foals = getFoalsBy(gameState, sireId);
      expect(foals).toHaveLength(2);
      expect(foals.map((f) => f.id).sort()).toEqual(["f1", "f2"]);
    });

    it("should cache getFoalsBy results", () => {
      const firstCall = getFoalsBy(gameState, sireId);
      const secondCall = getFoalsBy(gameState, sireId);
      expect(firstCall).toBe(secondCall); // Should be exact same array reference
    });

    it("should return foals matching damId", () => {
      const foals = getFoalsOf(gameState, damId);
      expect(foals).toHaveLength(2);
      expect(foals.map((f) => f.id).sort()).toEqual(["f1", "f3"]);
    });
  });

  describe("isStakesWinner and isG1Winner", () => {
    it("isStakesWinner is true if won a graded race", () => {
      expect(isStakesWinner(foal1)).toBe(true);
    });

    it("isStakesWinner is true if won a race with purse >= 18000", () => {
      expect(isStakesWinner(foal3)).toBe(true);
    });

    it("isStakesWinner is false if no wins or purse too low", () => {
      expect(isStakesWinner(foal2)).toBe(false);
    });

    it("isG1Winner is true only for G1 wins", () => {
      expect(isG1Winner(foal1)).toBe(true);
      expect(isG1Winner(foal3)).toBe(false); // Won 20k purse but no grade
    });
  });

  describe("getStakesFoalsBy and getG1FoalsBy", () => {
    it("counts stakes winning foals for a sire", () => {
      expect(getStakesFoalsBy(gameState, sireId)).toBe(1); // Only f1 is stakes winner for sire-1
      expect(getStakesFoalsBy(gameState, "other-sire")).toBe(1); // f3 is stakes winner for other-sire
    });

    it("counts G1 winning foals for a sire", () => {
      expect(getG1FoalsBy(gameState, sireId)).toBe(1); // f1 is G1 winner
      expect(getG1FoalsBy(gameState, "other-sire")).toBe(0); // f3 is not G1 winner
    });

    it("caches counts", () => {
      // populate cache
      getStakesFoalsBy(gameState, sireId);
      // mutate state to prove it reads from cache
      const alteredState: Pick<GameState, "horses"> = { horses: {} };
      expect(getStakesFoalsBy(alteredState, sireId)).toBe(1);
    });
  });

  describe("earnings", () => {
    it("calculates foalLifetimeEarnings based on position and PRIZE_SPLIT", () => {
      const expectedEarnings = Math.round(100000 * PRIZE_SPLIT[0]);
      expect(foalLifetimeEarnings(foal1)).toBe(expectedEarnings);
    });

    it("calculates totalEarningsBy a sire", () => {
      const expectedF1 = Math.round(100000 * PRIZE_SPLIT[0]);
      const expectedF2 = 0;
      expect(totalEarningsBy(gameState, sireId)).toBe(expectedF1 + expectedF2);
    });
  });

  describe("getRunnersBy", () => {
    it("returns foals age 2+ that have at least one race start", () => {
      const runners = getRunnersBy(gameState, sireId);
      expect(runners).toHaveLength(1);
      expect(runners[0].id).toBe("f1");
    });
  });
});
