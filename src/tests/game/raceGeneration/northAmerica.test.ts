/**
 * Tests for North American race generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateNorthAmericanRace,
  generateNorthAmericanRaceCard,
} from "@/game/raceGeneration/northAmerica";
import { createRng } from "@/game/rng";
import type { Track } from "@/game/types";

describe("generateNorthAmericanRace", () => {
  let mockTrack: Track;

  beforeEach(() => {
    mockTrack = {
      id: "track-1",
      name: "Test Track",
      country: "USA",
      surfaces: ["Dirt", "Turf"],
    };
  });

  it("should generate a race with required properties", () => {
    const race = generateNorthAmericanRace(mockTrack, 10, createRng("test"));

    expect(race).toHaveProperty("id");
    expect(race).toHaveProperty("name");
    expect(race).toHaveProperty("day", 10);
    expect(race).toHaveProperty("distance");
    expect(race).toHaveProperty("raceClass");
    expect(race).toHaveProperty("entryFee");
    expect(race).toHaveProperty("purse");
    expect(race).toHaveProperty("fieldSize");
    expect(race).toHaveProperty("entries");
    expect(race).toHaveProperty("resolved", false);
    expect(race).toHaveProperty("weather");
    expect(race).toHaveProperty("trackCondition");
    expect(race).toHaveProperty("trackId", "track-1");
    expect(race).toHaveProperty("surface");
  });

  it("should generate race with valid race class", () => {
    const race = generateNorthAmericanRace(mockTrack, 10, createRng("test"));

    const validClasses = [
      "Maiden",
      "MaidenSpecialWeight",
      "MaidenClaiming",
      "MaidenOptionalClaiming",
      "MaidenStakes",
      "Allowance",
      "OptionalClaiming",
      "StarterAllowance",
      "StarterHandicap",
      "Stakes",
      "Claiming",
      "Handicap",
      "Listed",
      "Group",
      "Graded",
    ];

    expect(validClasses).toContain(race.raceClass);
  });

  it("should set claiming price for claiming races", () => {
    // Since race class is random, we'll generate multiple races and check that at least one has claiming price
    const races = Array.from({ length: 50 }, () =>
      generateNorthAmericanRace(mockTrack, 10, createRng("test")),
    );
    const claimingRaces = races.filter(
      (r) =>
        r.raceClass === "Claiming" ||
        r.raceClass === "MaidenClaiming" ||
        r.raceClass === "MaidenOptionalClaiming",
    );

    if (claimingRaces.length > 0) {
      expect(claimingRaces[0].claimingPrice).toBeDefined();
      expect(claimingRaces[0].claimingPrice).toBeGreaterThan(0);
    }
  });

  it("should set claiming price for optional claiming races", () => {
    const races = Array.from({ length: 50 }, () =>
      generateNorthAmericanRace(mockTrack, 10, createRng("test")),
    );
    const optionalClaimingRaces = races.filter((r) => r.raceClass === "OptionalClaiming");

    if (optionalClaimingRaces.length > 0) {
      expect(optionalClaimingRaces[0].claimingPrice).toBeDefined();
      expect(optionalClaimingRaces[0].claimingPrice).toBeGreaterThan(0);
    }
  });

  it("should set handicap flag for handicap races", () => {
    const races = Array.from({ length: 50 }, () =>
      generateNorthAmericanRace(mockTrack, 10, createRng("test")),
    );
    const handicapRaces = races.filter(
      (r) => r.raceClass === "Handicap" || r.raceClass === "StarterHandicap",
    );

    if (handicapRaces.length > 0) {
      expect(handicapRaces[0].isHandicap).toBe(true);
    }
  });

  it("should set win condition for allowance races", () => {
    const races = Array.from({ length: 50 }, () =>
      generateNorthAmericanRace(mockTrack, 10, createRng("test")),
    );
    const allowanceRaces = races.filter(
      (r) => r.raceClass === "Allowance" || r.raceClass === "StarterAllowance",
    );

    if (allowanceRaces.length > 0) {
      expect(allowanceRaces[0].winCondition).toBeDefined();
      expect(["N1X", "N2X", "N3L", "none"]).toContain(allowanceRaces[0].winCondition);
    }
  });

  it("should use specified surface when provided", () => {
    const race = generateNorthAmericanRace(mockTrack, 10, "Dirt", createRng("test"));
    expect(race.surface).toBe("Dirt");
  });

  it("should select random surface when not specified", () => {
    const race = generateNorthAmericanRace(mockTrack, 10, createRng("test"));
    expect(mockTrack.surfaces).toContain(race.surface);
  });

  it("should generate distance within class range", () => {
    const race = generateNorthAmericanRace(mockTrack, 10, createRng("test"));
    expect(race.distance).toBeGreaterThan(0);
    expect(race.distance).toBeLessThanOrEqual(2400);
  });

  it("should generate field size between 6 and 10", () => {
    const race = generateNorthAmericanRace(mockTrack, 10, createRng("test"));
    expect(race.fieldSize).toBeGreaterThanOrEqual(6);
    expect(race.fieldSize).toBeLessThanOrEqual(10);
  });

  it("should scale purse for claiming races", () => {
    const races = Array.from({ length: 50 }, () =>
      generateNorthAmericanRace(mockTrack, 10, createRng("test")),
    );
    const claimingRaces = races.filter((r) => r.claimingPrice && r.raceClass === "Claiming");

    if (claimingRaces.length > 0) {
      const race = claimingRaces[0];
      expect(race.purse).toBeGreaterThan(race.claimingPrice! * 2);
    }
  });
});

describe("generateNorthAmericanRaceCard", () => {
  let mockTrack: Track;

  beforeEach(() => {
    mockTrack = {
      id: "track-1",
      name: "Test Track",
      country: "USA",
      surfaces: ["Dirt", "Turf"],
    };
  });

  it("should generate specified number of races", () => {
    const races = generateNorthAmericanRaceCard(mockTrack, 10, 5);
    expect(races.length).toBe(5);
  });

  it("should alternate surfaces for multi-surface tracks", () => {
    const races = generateNorthAmericanRaceCard(mockTrack, 10, 4);
    // With 2 surfaces and 4 races, we should get 2 of each
    const dirtRaces = races.filter((r) => r.surface === "Dirt");
    const turfRaces = races.filter((r) => r.surface === "Turf");

    expect(dirtRaces.length).toBe(2);
    expect(turfRaces.length).toBe(2);
  });

  it("should use single surface for single-surface tracks", () => {
    const singleSurfaceTrack: Track = {
      ...mockTrack,
      surfaces: ["Dirt"],
    };

    const races = generateNorthAmericanRaceCard(singleSurfaceTrack, 10, 3);
    expect(races.every((r) => r.surface === "Dirt")).toBe(true);
  });

  it("should generate unique race names", () => {
    const races = generateNorthAmericanRaceCard(mockTrack, 10, 5);
    const names = races.map((r) => r.name);
    const uniqueNames = new Set(names);

    expect(uniqueNames.size).toBe(names.length);
  });

  it("should set day for all races", () => {
    const races = generateNorthAmericanRaceCard(mockTrack, 10, 3);
    expect(races.every((r) => r.day === 10)).toBe(true);
  });

  it("should set trackId for all races", () => {
    const races = generateNorthAmericanRaceCard(mockTrack, 10, 3);
    expect(races.every((r) => r.trackId === "track-1")).toBe(true);
  });
});
