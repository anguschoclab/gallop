import { describe, it, expect } from "vitest";
import { getRaceCountry, getCountry, type GradedRace } from "./gradedRaces";

describe("getCountry", () => {
  it("returns the correct country for a mapped track", () => {
    expect(getCountry("Woodbine")).toBe("Canada");
    expect(getCountry("Meydan")).toBe("UAE");
    expect(getCountry("Tokyo")).toBe("Japan");
    expect(getCountry("Ascot")).toBe("Great Britain");
    expect(getCountry("Longchamp")).toBe("France");
  });

  it("returns 'Other' for an unknown track", () => {
    expect(getCountry("Unknown Track")).toBe("Other");
    expect(getCountry("")).toBe("Other");
    expect(getCountry("Flemington")).toBe("Other"); // Not in trackToCountry map
  });
});

describe("getRaceCountry", () => {
  it("returns race.country if it is explicitly defined", () => {
    const raceWithCountry = { country: "Custom Country", track: "Woodbine" } as GradedRace;
    expect(getRaceCountry(raceWithCountry)).toBe("Custom Country");
  });

  it("derives the country from the track if race.country is undefined", () => {
    const raceWithoutCountry = { track: "Woodbine" } as GradedRace;
    expect(getRaceCountry(raceWithoutCountry)).toBe("Canada");
  });

  it("returns 'Other' if neither country is defined nor the track is mapped", () => {
    const raceUnknown = { track: "Moon Base Alpha" } as GradedRace;
    expect(getRaceCountry(raceUnknown)).toBe("Other");
  });
});
