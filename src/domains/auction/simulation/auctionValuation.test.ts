import { describe, it, expect } from "vitest";
import { calculateLotValuation, npcBaseValuation } from "./auctionValuation";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { horseMarketValue } from "@/domains/horse/simulation/pricing";

const defaultStats = {
  conformation: 50,
  temperament: 50,
  speed: 50,
  stamina: 50,
  acceleration: 50,
  consistency: 50,
  gate: 50,
  heart: 50,
  injuryProneness: 50,
  soundness: 50,
};

describe("auctionValuation", () => {
  describe("npcBaseValuation", () => {
    it("scales base market value by stable tier", () => {
      const horse = createTestHorse({ age: 1, stats: defaultStats, gender: "colt" });
      const budgetStable = createTestStable({ tier: "budget", personality: "conservative" });
      const midStable = createTestStable({ tier: "mid", personality: "conservative" });
      const eliteStable = createTestStable({ tier: "elite", personality: "conservative" });

      const baseVal = horseMarketValue(horse);

      expect(npcBaseValuation(horse, budgetStable)).toBe(baseVal);
      expect(npcBaseValuation(horse, midStable)).toBe(Math.round(baseVal * 1.1));
      expect(npcBaseValuation(horse, eliteStable)).toBe(Math.round(baseVal * 1.25));
    });
  });

  describe("calculateLotValuation", () => {
    it("applies conservative discount correctly", () => {
      const horse = createTestHorse({ age: 1, stats: defaultStats, gender: "colt" });
      const stable = createTestStable({ tier: "budget", personality: "conservative" });

      const baseVal = npcBaseValuation(horse, stable);
      const val = calculateLotValuation(horse, stable, "yearling");

      // AUCTION_CONSERVATIVE_DISCOUNT is 0.25, so multiplier is 0.75
      expect(val).toBe(Math.round(baseVal * 0.75));
    });

    it("applies aggressive premium for 2yos in training", () => {
      const horse = createTestHorse({ age: 2, stats: defaultStats, gender: "colt" });
      const stable = createTestStable({ tier: "budget", personality: "aggressive" });

      const baseVal = npcBaseValuation(horse, stable);
      const val = calculateLotValuation(horse, stable, "2yo_training");

      // AUCTION_AGGRESSIVE_PREMIUM is 0.3, AUCTION_2YO_TRAINING_PREMIUM is 0.25
      // mod = (1 + 0.3) * (1 + 0.25) = 1.3 * 1.25 = 1.625
      expect(val).toBe(Math.round(baseVal * 1.625));
    });

    it("applies conformation and temperament bonuses", () => {
      const horse = createTestHorse({
        age: 1,
        stats: { ...defaultStats, conformation: 95, temperament: 95 },
        gender: "colt",
      });
      const stable = createTestStable({ tier: "budget", personality: "conservative" });

      const baseVal = npcBaseValuation(horse, stable);
      const val = calculateLotValuation(horse, stable, "yearling");

      // mod = 0.75 * 1.1 (conformation) * 1.05 (temperament) = 0.86625
      expect(val).toBe(Math.round(baseVal * 0.75 * 1.1 * 1.05));
    });

    it("evaluates specialist distance match correctly", () => {
      const horse = createTestHorse({
        age: 1,
        distanceAptitude: 2000,
        stats: defaultStats,
        gender: "colt",
      });

      const matchingStable = createTestStable({
        tier: "budget",
        personality: "specialist",
        preferredDistance: 2000,
      });
      const nonMatchingStable = createTestStable({
        tier: "budget",
        personality: "specialist",
        preferredDistance: 1200,
      });

      const matchVal = calculateLotValuation(horse, matchingStable, "yearling");
      const noMatchVal = calculateLotValuation(horse, nonMatchingStable, "yearling");

      // match modifier is 1.5, non-match is 0.5
      expect(matchVal).toBe(Math.round(npcBaseValuation(horse, matchingStable) * 1.5));
      expect(noMatchVal).toBe(Math.round(npcBaseValuation(horse, nonMatchingStable) * 0.5));
    });
  });
});
