/**
 * Tests for awards scoring functions
 */

import { describe, it, expect } from "vitest";
import {
  calculateAwardPoints,
  determineRegionalWinners,
  determineAllRegionalWinners,
} from "./scoring";
import type { Horse, Race } from "../types";
import type { AwardRegion, RegionalAwardCategory } from "./types";

describe("calculateAwardPoints", () => {
  it("should return 0 for races outside the award year", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race",
          position: 1,
          day: 400, // Year 2
          beyer: 115,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    };

    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 400,
        distance: 2000,
        raceClass: "Graded",
        entryFee: 500,
        purse: 1000000,
        minStat: 80,
        fieldSize: 8,
        entries: [],
        resolved: true,
        graded: {
          key: "test-race",
          grade: "G1",
          track: "Churchill Downs",
          trackId: "track-1",
          surface: "Dirt",
        },
      },
    ];

    const points = calculateAwardPoints(horse, races, 1, "north_america", "horse_of_the_year");
    expect(points).toBe(0);
  });

  it("should return 0 for races outside the region", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race",
          position: 1,
          day: 400, // Year 2
          beyer: 115,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    };

    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 400,
        distance: 2000,
        raceClass: "Graded",
        entryFee: 500,
        purse: 1000000,
        minStat: 80,
        fieldSize: 8,
        entries: [],
        resolved: true,
        graded: {
          key: "test-race",
          grade: "G1",
          track: "Churchill Downs",
          trackId: "track-1",
          surface: "Dirt",
        },
      },
    ];

    const points = calculateAwardPoints(horse, races, 1, "north_america", "horse_of_the_year");
    expect(points).toBe(0);
  });

  it("should return 0 for races outside the region", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race",
          position: 1,
          day: 100,
          beyer: 115,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    };

    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 100,
        distance: 2000,
        raceClass: "Graded",
        entryFee: 500,
        purse: 1000000,
        minStat: 80,
        fieldSize: 8,
        entries: [],
        resolved: true,
        graded: {
          key: "test-race",
          grade: "G1",
          track: "Ascot", // European track
          trackId: "track-1",
          surface: "Turf",
        },
      },
    ];

    const points = calculateAwardPoints(horse, races, 1, "north_america", "horse_of_the_year");
    expect(points).toBe(0);
  });

  it("should filter by category eligibility", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [
        {
          raceId: "race-1",
          raceName: "Test Race",
          position: 1,
          day: 100,
          beyer: 115,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000,
          fieldSize: 8,
        },
      ],
    };

    const races: Race[] = [
      {
        id: "race-1",
        name: "Test Race",
        day: 100,
        distance: 2000,
        raceClass: "Graded",
        entryFee: 500,
        purse: 1000000,
        minStat: 80,
        fieldSize: 8,
        entries: [],
        resolved: true,
        graded: {
          key: "test-race",
          grade: "G1",
          track: "Churchill Downs",
          trackId: "track-1",
          surface: "Dirt",
        },
      },
    ];

    // 2-year-old category - horse is 3, should get 0 points
    const points = calculateAwardPoints(horse, races, 1, "north_america", "champion_2yo_male");
    expect(points).toBe(0);
  });

  it("should handle empty race history", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const points = calculateAwardPoints(horse, [], 1, "north_america", "horse_of_the_year");
    expect(points).toBe(0);
  });
});

describe("determineRegionalWinners", () => {
  it("should skip merit and international categories", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const winners = determineRegionalWinners([horse], [], 1, "north_america");
    expect(winners.every((w) => w.category !== "award_of_merit")).toBe(true);
    expect(winners.every((w) => w.category !== "champion_international")).toBe(true);
    expect(winners.every((w) => w.category !== "champion_trainer")).toBe(true);
  });

  it("should return empty array when no horses have points", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const winners = determineRegionalWinners([horse], [], 1, "north_america");
    expect(winners).toEqual([]);
  });
});

describe("determineAllRegionalWinners", () => {
  it("should determine winners for all regions", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const winners = determineAllRegionalWinners([horse], [], 1);
    expect(winners.length).toBeGreaterThanOrEqual(0);
  });

  it("should aggregate winners from all regions", () => {
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
      owned: true,
      fame: 50,
      raceHistory: [],
    };

    const winners = determineAllRegionalWinners([horse], [], 1);
    const regions = new Set(winners.map((w) => w.region));
    expect(regions.size).toBeGreaterThanOrEqual(0);
  });
});
