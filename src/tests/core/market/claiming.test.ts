import { describe, it, expect } from "vitest";
import {
  processClaims,
  isHorseEligibleForClaimingPrice,
  getSuggestedClaimingPriceRange,
  validateClaimingRace,
  type ClaimAttempt,
} from "@/core/market/claiming";
import { createTestHorse } from "@/tests/helpers";
import type { Race } from "@/core/race/types";

function createTestRace(overrides?: Partial<Race>): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Claiming",
    entryFee: 0,
    purse: 100000,
    fieldSize: 2,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}
import { createTestRng } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";

describe("Claiming Mechanics", () => {
  describe("processClaims", () => {
    it("returns empty arrays if race has no claiming price or is not resolved", () => {
      const race = createTestRace({ id: "race-1", resolved: true, claimingPrice: undefined });
      const { transfers, logs } = processClaims(race, [], [], 1);
      expect(transfers).toHaveLength(0);
      expect(logs).toHaveLength(0);
    });

    it("processes a single valid claim", () => {
      const race = createTestRace({
        id: "race-1",
        resolved: true,
        claimingPrice: 10000,
        name: "Test Race",
      });
      const horse = createTestHorse({ id: "horse-1", ownership: makeNpcOwned("stable-1"), name: "Test Horse" });
      const claim: ClaimAttempt = {
        claimantStableId: "stable-2",
        horseId: "horse-1",
        claimingPrice: 10000,
        successful: false, // Initial state doesn't matter
      };

      const { transfers, logs } = processClaims(race, [claim], [horse], 1);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toMatchObject({
        horseId: "horse-1",
        fromStableId: "stable-1",
        toStableId: "stable-2",
        price: 10000,
        raceId: "race-1",
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain("Test Horse claimed for $10,000 by stable stable-2");
    });

    it("handles multiple claims for the same horse using RNG", () => {
      const race = createTestRace({ id: "race-1", resolved: true, claimingPrice: 10000 });
      const horse = createTestHorse({ id: "horse-1", ownership: makeNpcOwned("stable-1") });
      const claims: ClaimAttempt[] = [
        {
          claimantStableId: "stable-2",
          horseId: "horse-1",
          claimingPrice: 10000,
          successful: false,
        },
        {
          claimantStableId: "stable-3",
          horseId: "horse-1",
          claimingPrice: 10000,
          successful: false,
        },
      ];

      const rng = createTestRng("1"); // Ensure deterministic selection
      const { transfers } = processClaims(race, claims, [horse], 1, rng);
      expect(transfers).toHaveLength(1);
      expect(transfers[0].toStableId).toBeDefined();
    });
  });

  describe("isHorseEligibleForClaimingPrice", () => {
    it("returns false if horse is significantly over-qualified", () => {
      const horse = createTestHorse({
        stats: {
          speed: 90,
          stamina: 90,
          acceleration: 90,
          consistency: 90,
          temperament: 50,
          conformation: 50,
        },
      });
      // High stats mean estimated value > 1.5 * claiming price (5000)
      expect(isHorseEligibleForClaimingPrice(horse, 5000, [])).toBe(false);
    });

    it("returns false if horse has won a high-level race", () => {
      const horse = createTestHorse({
        stats: {
          speed: 50,
          stamina: 50,
          acceleration: 50,
          consistency: 50,
          temperament: 50,
          conformation: 50,
        },
        raceHistory: [
          {
            raceId: "r1",
            raceName: "G1 Stakes",
            position: 1,
            day: 1,
            grade: "G1",
          },
        ],
      });
      expect(isHorseEligibleForClaimingPrice(horse, 50000, [])).toBe(false);
    });

    it("returns true if horse is eligible", () => {
      const horse = createTestHorse({
        stats: {
          speed: 40,
          stamina: 40,
          acceleration: 40,
          consistency: 40,
          temperament: 50,
          conformation: 50,
        },
      });
      expect(isHorseEligibleForClaimingPrice(horse, 50000, [])).toBe(true);
    });
  });

  describe("getSuggestedClaimingPriceRange", () => {
    it("returns a valid claiming price range", () => {
      const horse = createTestHorse({
        stats: {
          speed: 50,
          stamina: 50,
          acceleration: 50,
          consistency: 50,
          temperament: 50,
          conformation: 50,
        },
      });
      const range = getSuggestedClaimingPriceRange(horse);
      expect(range).toHaveLength(2);
      expect(range[0]).toBeLessThanOrEqual(range[1]);
    });
  });

  describe("validateClaimingRace", () => {
    it("validates correct claiming race configuration", () => {
      const race = createTestRace({ claimingPrice: 10000, purse: 10000, raceClass: "Claiming" });
      const { valid, issues } = validateClaimingRace(race);
      expect(valid).toBe(true);
      expect(issues).toHaveLength(0);
    });

    it("invalidates missing claiming price", () => {
      const race = createTestRace({ claimingPrice: undefined });
      const { valid, issues } = validateClaimingRace(race);
      expect(valid).toBe(false);
      expect(issues).toContain("Claiming race must have a claiming price");
    });

    it("invalidates purse less than claiming price", () => {
      const race = createTestRace({ claimingPrice: 10000, purse: 5000 });
      const { valid, issues } = validateClaimingRace(race);
      expect(valid).toBe(false);
      expect(issues).toContain("Purse should be at least equal to claiming price");
    });
  });
});
