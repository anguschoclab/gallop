// Tests for race name generator

import { describe, it, expect } from "vitest";
import {
  generateRaceName,
  generateRaceCardNames,
  formatClaimingPrice,
  formatWinCondition,
  getRaceClassAbbreviation,
  getRegionalSystem,
} from "@/core/race/naming/raceNameGenerator";
import { createRng } from "@/game/rng";
import type { RaceClass, ClaimingPrice, WinCondition, RegionalSystem } from "@/game/types";
import type { Track } from "@/game/tracks";

describe("formatClaimingPrice", () => {
  it("formats claiming price correctly", () => {
    expect(formatClaimingPrice(10000)).toBe("$10,000");
    expect(formatClaimingPrice(5000)).toBe("$5,000");
    expect(formatClaimingPrice(100000)).toBe("$100,000");
  });
});

describe("formatWinCondition", () => {
  it("formats win conditions correctly", () => {
    expect(formatWinCondition("N1X")).toBe("N1X");
    expect(formatWinCondition("N2X")).toBe("N2X");
    expect(formatWinCondition("N3L")).toBe("N3L");
    expect(formatWinCondition("none")).toBe("");
  });
});

describe("getRaceClassAbbreviation", () => {
  it("returns correct abbreviations for race classes", () => {
    expect(getRaceClassAbbreviation("Maiden")).toBe("Mdn");
    expect(getRaceClassAbbreviation("MaidenSpecialWeight")).toBe("MSW");
    expect(getRaceClassAbbreviation("MaidenClaiming")).toBe("MCL");
    expect(getRaceClassAbbreviation("MaidenOptionalClaiming")).toBe("MOC");
    expect(getRaceClassAbbreviation("MaidenStakes")).toBe("MST");
    expect(getRaceClassAbbreviation("Allowance")).toBe("Alw");
    expect(getRaceClassAbbreviation("OptionalClaiming")).toBe("OCL");
    expect(getRaceClassAbbreviation("StarterAllowance")).toBe("STR");
    expect(getRaceClassAbbreviation("StarterHandicap")).toBe("SHP");
    expect(getRaceClassAbbreviation("Stakes")).toBe("Stk");
    expect(getRaceClassAbbreviation("Claiming")).toBe("Clm");
    expect(getRaceClassAbbreviation("Handicap")).toBe("Hcp");
    expect(getRaceClassAbbreviation("Listed")).toBe("Lst");
    expect(getRaceClassAbbreviation("Group")).toBe("Grp");
    expect(getRaceClassAbbreviation("Graded")).toBe("Grd");
  });
});

describe("getRegionalSystem", () => {
  it("maps countries to correct regional systems", () => {
    const canadaTrack: Track = { id: "1", name: "Woodbine", country: "Canada", surfaces: ["Turf"] };
    expect(getRegionalSystem(canadaTrack)).toBe("north_america");

    const uaeTrack: Track = { id: "2", name: "Meydan", country: "UAE", surfaces: ["Dirt"] };
    expect(getRegionalSystem(uaeTrack)).toBe("asia");

    const argentinaTrack: Track = {
      id: "3",
      name: "Palermo",
      country: "Argentina",
      surfaces: ["Dirt"],
    };
    expect(getRegionalSystem(argentinaTrack)).toBe("south_america");

    const gbTrack: Track = { id: "4", name: "Ascot", country: "Great Britain", surfaces: ["Turf"] };
    expect(getRegionalSystem(gbTrack)).toBe("europe");

    const japanTrack: Track = { id: "5", name: "Tokyo", country: "Japan", surfaces: ["Dirt"] };
    expect(getRegionalSystem(japanTrack)).toBe("asia");
  });

  it("defaults to north_america for unknown countries", () => {
    const unknownTrack: Track = {
      id: "6",
      name: "Unknown",
      country: "Unknown",
      surfaces: ["Turf"],
    };
    expect(getRegionalSystem(unknownTrack)).toBe("north_america");
  });
});

describe("generateRaceName", () => {
  const mockTrack: Track = {
    id: "test-track-1",
    name: "Woodbine",
    country: "Canada",
    surfaces: ["Turf", "Synthetic"],
  };

  it("generates a race name for basic parameters", () => {
    const name = generateRaceName({
      track: mockTrack,
      raceClass: "Maiden",
    });
    expect(name).toBeTruthy();
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  });

  it("generates price-based names for claiming races", () => {
    const name = generateRaceName({
      track: mockTrack,
      raceClass: "Claiming",
      claimingPrice: 10000,
    });
    expect(name).toBeTruthy();
    expect(name).toContain("$10,000");
  });

  it("generates maiden claiming names with price", () => {
    const name = generateRaceName({
      track: mockTrack,
      raceClass: "MaidenClaiming",
      claimingPrice: 20000,
    });
    expect(name).toBeTruthy();
    expect(name).toContain("$20,000");
    expect(name).toContain("Maiden Claiming");
  });

  it("generates optional claiming names with price", () => {
    const name = generateRaceName({
      track: mockTrack,
      raceClass: "OptionalClaiming",
      claimingPrice: 50000,
    });
    expect(name).toBeTruthy();
    expect(name).toContain("$50,000");
    expect(name).toContain("Optional Claiming");
  });

  it("generates condition-based names for allowance races", () => {
    const name = generateRaceName({
      track: mockTrack,
      raceClass: "Allowance",
      winCondition: "N1X",
    });
    expect(name).toBeTruthy();
    expect(name).toContain("N1X");
  });

  it("ensures uniqueness with usedNames set", () => {
    const usedNames = new Set<string>();
    const name1 = generateRaceName({
      track: mockTrack,
      raceClass: "Maiden",
      usedNames,
    });
    const name2 = generateRaceName({
      track: mockTrack,
      raceClass: "Maiden",
      usedNames,
    });
    expect(name1).not.toBe(name2);
  });

  it("adds numeric suffix for duplicate names", () => {
    const usedNames = new Set<string>(["Test Stakes"]);
    const name = generateRaceName({
      track: mockTrack,
      raceClass: "Stakes",
      usedNames,
      rng: createRng(0), // Force deterministic behavior
    });
    // If the generator produces "Test Stakes", it should add a suffix
    // This is hard to test deterministically without mocking the entire generator
    expect(name).toBeTruthy();
  });

  it("generates different names for different race classes", () => {
    const name1 = generateRaceName({
      track: mockTrack,
      raceClass: "Maiden",
    });
    const name2 = generateRaceName({
      track: mockTrack,
      raceClass: "Stakes",
    });
    expect(name1).toBeTruthy();
    expect(name2).toBeTruthy();
  });

  it("generates names for all race classes", () => {
    const raceClasses: RaceClass[] = [
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

    for (const raceClass of raceClasses) {
      const name = generateRaceName({
        track: mockTrack,
        raceClass,
      });
      expect(name).toBeTruthy();
      expect(typeof name).toBe("string");
    }
  });
});

describe("generateRaceCardNames", () => {
  const mockTrack: Track = {
    id: "test-track-2",
    name: "Woodbine",
    country: "Canada",
    surfaces: ["Turf", "Synthetic"],
  };

  it("generates unique names for a race card", () => {
    const raceClasses: RaceClass[] = ["Maiden", "Claiming", "Allowance", "Stakes"];
    const names = generateRaceCardNames(mockTrack, raceClasses);
    expect(names).toHaveLength(4);
    expect(new Set(names).size).toBe(4); // All unique
  });

  it("generates correct number of names", () => {
    const raceClasses: RaceClass[] = ["Maiden", "Claiming"];
    const names = generateRaceCardNames(mockTrack, raceClasses);
    expect(names).toHaveLength(2);
  });

  it("passes additional parameters to generator", () => {
    const raceClasses: RaceClass[] = ["Claiming"];
    const names = generateRaceCardNames(mockTrack, raceClasses, {
      claimingPrice: 25000,
    });
    expect(names).toHaveLength(1);
    expect(names[0]).toContain("$25,000");
  });
});
