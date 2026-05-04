import { describe, it, expect } from "vitest";
import { getRaceCountry, getCountry, GradedRace } from "./gradedRaces";

describe("getRaceCountry", () => {
  it("should return the explicitly assigned country if race.country is defined", () => {
    const mockRace = {
      country: "UAE",
      track: "Meydan",
    } as GradedRace;
    expect(getRaceCountry(mockRace)).toBe("UAE");
  });

  it("should derive the country from the track if race.country is not defined", () => {
    const mockRace = {
      track: "Woodbine",
    } as GradedRace;
    expect(getRaceCountry(mockRace)).toBe("Canada");
  });

  it("should return 'Other' for an unknown track without an explicit country", () => {
    const mockRace = {
      track: "Unknown Track",
    } as GradedRace;
    expect(getRaceCountry(mockRace)).toBe("Other");
  });
});

describe("getCountry", () => {
  it("should return the correct country for a known track", () => {
    expect(getCountry("Woodbine")).toBe("Canada");
    expect(getCountry("Madrid")).toBe("Spain");
  });

  it("should return 'Other' for an unknown track", () => {
    expect(getCountry("Unknown Track")).toBe("Other");
  });
});
