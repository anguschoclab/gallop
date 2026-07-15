import { describe, it, expect } from "vitest";
import {
  calculateWinProbability,
  probabilityToMorningLine,
  formatOdds,
  createBettingPool,
  updateOdds,
} from "@/core/odds/oddsTypes";

describe("oddsTypes", () => {
  describe("calculateWinProbability", () => {
    it("calculates base probability properly based on stats", () => {
      // 50, 50, 50 => base 150/300 = 0.5. form 100/200 = 0.5 => prob = 1.0 (clamped to 0.95)
      expect(calculateWinProbability(50, 50, 50, 100)).toBeCloseTo(0.95);

      // 0, 0, 0 => base 0. form 0 => prob 0 (clamped to 0.05)
      expect(calculateWinProbability(0, 0, 0, 0)).toBeCloseTo(0.05);

      // (30 + 30 + 30) / 300 = 0.3. form 20 / 200 = 0.1. total = 0.4
      expect(calculateWinProbability(30, 30, 30, 20)).toBeCloseTo(0.4);
    });

    it("applies class bonus correctly", () => {
      // 30, 30, 30 => base 0.3. form 20 => 0.1. classBonus = 10 => 0.1. Total = 0.5
      expect(calculateWinProbability(30, 30, 30, 20, 10)).toBeCloseTo(0.5);
    });
  });

  describe("probabilityToMorningLine", () => {
    it("maps probabilities to numeric morning line odds", () => {
      expect(probabilityToMorningLine(0.6)).toBe(1);
      expect(probabilityToMorningLine(0.35)).toBe(2);
      expect(probabilityToMorningLine(0.26)).toBe(3);
      expect(probabilityToMorningLine(0.2)).toBe(4);
      expect(probabilityToMorningLine(0.04)).toBe(30);
    });

    it("covers all 12 conditional branches", () => {
      expect(probabilityToMorningLine(0.5)).toBe(1);
      expect(probabilityToMorningLine(0.33)).toBe(2);
      expect(probabilityToMorningLine(0.25)).toBe(3);
      expect(probabilityToMorningLine(0.2)).toBe(4);
      expect(probabilityToMorningLine(0.17)).toBe(5);
      expect(probabilityToMorningLine(0.14)).toBe(6);
      expect(probabilityToMorningLine(0.12)).toBe(8);
      expect(probabilityToMorningLine(0.1)).toBe(10);
      expect(probabilityToMorningLine(0.08)).toBe(12);
      expect(probabilityToMorningLine(0.06)).toBe(15);
      expect(probabilityToMorningLine(0.05)).toBe(20);
      expect(probabilityToMorningLine(0.01)).toBe(30);
    });
  });

  describe("formatOdds", () => {
    it("formats standard integer odds", () => {
      expect(formatOdds(5)).toBe("5-1");
      expect(formatOdds(10)).toBe("10-1");
    });

    it("formats 1-1 or below properly", () => {
      expect(formatOdds(1)).toBe("1-1");
      expect(formatOdds(0.5)).toBe("1-1");
    });

    it("formats fractional odds accurately", () => {
      expect(formatOdds(2.5)).toBe("2.5-1");
    });
  });

  describe("createBettingPool", () => {
    it("creates a pool from horse probabilities", () => {
      const pool = createBettingPool("race-1", {
        h1: 0.5,
        h2: 0.5,
      });

      expect(pool.raceId).toBe("race-1");
      // totalPool equals sum of horseBets (10000 * 0.5 + 10000 * 0.5 = 10000)
      expect(pool.totalPool).toBe(10000);

      expect(pool.horseBets["h1"]).toBe(5000);
      expect(pool.horseBets["h2"]).toBe(5000);

      expect(pool.odds.find((o) => o.horseId === "h1")?.winProbability).toBe(0.5);
      expect(pool.odds.find((o) => o.horseId === "h1")?.morningLine).toBe(1);
    });

    it("totalPool equals sum of horseBets even when probabilities don't sum to 1", () => {
      const pool = createBettingPool("race-partial", {
        h1: 0.1,
        h2: 0.2,
      });

      const sumOfBets = Object.values(pool.horseBets).reduce((a, b) => a + b, 0);
      expect(pool.totalPool).toBe(sumOfBets);
      expect(sumOfBets).toBe(3000);
    });
  });

  describe("updateOdds", () => {
    it("updates pool and recalculates currentOdds based on pool share", () => {
      const initialPool = createBettingPool("race-1", {
        h1: 0.5, // starts at 5000 bet
        h2: 0.5, // starts at 5000 bet
      });

      // Bet an enormous amount on h2 to heavily skew the pool
      const updated = updateOdds(initialPool, "h2", 90000);

      expect(updated.totalPool).toBe(100000);
      expect(updated.horseBets["h2"]).toBe(95000); // 5000 + 90000
      expect(updated.horseBets["h1"]).toBe(5000);

      const oddsH2 = updated.odds.find((o) => o.horseId === "h2");
      const oddsH1 = updated.odds.find((o) => o.horseId === "h1");

      // H2 now has 95% of pool, share = 0.95 => 1-1 odds
      expect(oddsH2?.currentOdds).toBe(1);

      // H1 has 5% of pool, share = 0.05 => 20-1 odds
      expect(oddsH1?.currentOdds).toBe(20);
    });
  });
});
