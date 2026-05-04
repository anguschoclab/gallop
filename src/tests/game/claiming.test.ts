/**
 * Tests for claiming race mechanics
 */

import { describe, it, expect } from "vitest";
import {
  processClaims,
  isHorseEligibleForClaimingPrice,
  getSuggestedClaimingPriceRange,
  validateClaimingRace,
  type ClaimAttempt,
} from "@/game/claiming";
import type { Horse, Race } from "@/game/types";

describe("processClaims", () => {
  it("should return empty result when race is not a claiming race", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Race",
      day: 10,
      distance: 2000,
      raceClass: "Maiden",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: true,
    };

    const claims: ClaimAttempt[] = [];
    const horses: Horse[] = [];
    const currentDay = 10;

    const result = processClaims(race, claims, horses, currentDay);
    expect(result.transfers).toEqual([]);
    expect(result.logs).toEqual([]);
  });

  it("should return empty result when race is not resolved", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Race",
      day: 10,
      distance: 2000,
      raceClass: "Claiming",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
      claimingPrice: 10000,
    };

    const claims: ClaimAttempt[] = [];
    const horses: Horse[] = [];
    const currentDay = 10;

    const result = processClaims(race, claims, horses, currentDay);
    expect(result.transfers).toEqual([]);
    expect(result.logs).toEqual([]);
  });

  it("should process single claim successfully", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Claiming Race",
      day: 10,
      distance: 2000,
      raceClass: "Claiming",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: true,
      claimingPrice: 10000,
    };

    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 90,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

    const claims: ClaimAttempt[] = [
      {
        claimantStableId: "stable-2",
        horseId: "horse-1",
        claimingPrice: 10000,
        successful: false,
      },
    ];

    const result = processClaims(race, claims, [horse], 10);
    expect(result.transfers.length).toBe(1);
    expect(result.transfers[0].horseId).toBe("horse-1");
    expect(result.transfers[0].fromStableId).toBe("stable-1");
    expect(result.transfers[0].toStableId).toBe("stable-2");
    expect(result.transfers[0].price).toBe(10000);
    expect(result.logs.length).toBe(1);
  });

  it("should handle multiple claims on same horse", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Claiming Race",
      day: 10,
      distance: 2000,
      raceClass: "Claiming",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: true,
      claimingPrice: 10000,
    };

    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      potential: 90,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

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

    const result = processClaims(race, claims, [horse], 10);
    expect(result.transfers.length).toBe(1);
    expect(result.logs.length).toBe(2); // One winner, one loser
  });

  it("should skip claims for horses not found", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Claiming Race",
      day: 10,
      distance: 2000,
      raceClass: "Claiming",
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: true,
      claimingPrice: 10000,
    };

    const claims: ClaimAttempt[] = [
      {
        claimantStableId: "stable-2",
        horseId: "horse-1",
        claimingPrice: 10000,
        successful: false,
      },
    ];

    const result = processClaims(race, claims, [], 10);
    expect(result.transfers).toEqual([]);
    expect(result.logs).toEqual([]);
  });
});

describe("isHorseEligibleForClaimingPrice", () => {
  it("should return true for horse with appropriate stats", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const eligible = isHorseEligibleForClaimingPrice(horse, 50000, [horse]);
    expect(eligible).toBe(true);
  });

  it("should return false for horse worth significantly more than claiming price", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 95, stamina: 95, acceleration: 95, consistency: 95 },
      potential: 98,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const eligible = isHorseEligibleForClaimingPrice(horse, 10000, [horse]);
    expect(eligible).toBe(false);
  });

  it("should return false for horse with graded stakes wins", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: true,
      fame: 50,
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "G1 Race",
          position: 1,
          day: 10,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    };

    const eligible = isHorseEligibleForClaimingPrice(horse, 50000, [horse]);
    expect(eligible).toBe(false);
  });

  it("should return true for horse with only allowance wins", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: true,
      fame: 50,
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Allowance Race",
          position: 1,
          day: 10,
          distance: 2000,
          surface: "Dirt",
          purse: 50000,
          fieldSize: 8,
        },
      ],
    };

    const eligible = isHorseEligibleForClaimingPrice(horse, 50000, [horse]);
    expect(eligible).toBe(true);
  });
});

describe("getSuggestedClaimingPriceRange", () => {
  it("should return price range for average horse", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 75, stamina: 75, acceleration: 75, consistency: 75 },
      potential: 80,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const [min, max] = getSuggestedClaimingPriceRange(horse);
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThanOrEqual(min);
  });

  it("should return higher range for elite horse", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 90, stamina: 90, acceleration: 90, consistency: 90 },
      potential: 95,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const [min, max] = getSuggestedClaimingPriceRange(horse);
    expect(min).toBeGreaterThan(50000);
    expect(max).toBeGreaterThanOrEqual(min);
  });

  it("should return lower range for low-tier horse", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 3,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 50, stamina: 50, acceleration: 50, consistency: 50 },
      potential: 55,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const [min, max] = getSuggestedClaimingPriceRange(horse);
    expect(min).toBe(40000); // Closest to 50,000 estimated value
    expect(max).toBeGreaterThanOrEqual(min);
  });
});

describe("validateClaimingRace", () => {
  it("should return valid for properly configured claiming race", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Claiming Race",
      day: 10,
      distance: 2000,
      raceClass: "Claiming",
      entryFee: 500,
      purse: 15000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
      claimingPrice: 10000,
    };

    const result = validateClaimingRace(race);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("should return invalid for race without claiming price", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Race",
      day: 10,
      distance: 2000,
      raceClass: "Claiming",
      entryFee: 500,
      purse: 15000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const result = validateClaimingRace(race);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Claiming race must have a claiming price");
  });

  it("should return invalid when purse is less than claiming price", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Claiming Race",
      day: 10,
      distance: 2000,
      raceClass: "Claiming",
      entryFee: 500,
      purse: 5000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
      claimingPrice: 10000,
    };

    const result = validateClaimingRace(race);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Purse should be at least equal to claiming price");
  });

  it("should return invalid for optional claiming with insufficient purse", () => {
    const race: Race = {
      id: "race-1",
      name: "Test Optional Claiming Race",
      day: 10,
      distance: 2000,
      raceClass: "OptionalClaiming",
      entryFee: 500,
      purse: 15000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
      claimingPrice: 10000,
    };

    const result = validateClaimingRace(race);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Optional claiming purse should be at least 2x claiming price");
  });
});
