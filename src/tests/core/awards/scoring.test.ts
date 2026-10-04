import { describe, it, expect } from "vitest";
import { calculateAwardPoints } from "@/core/awards/scoring";
import { Horse } from "@/core/types";
import { Race } from "@/core/race/types";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";

// Utility to create a minimal horse for testing
function createMockHorse(
  id: string,
  age: number,
  gender: "colt" | "filly" | "horse" | "mare" | "gelding",
  raceHistory: Horse["raceHistory"] = [],
  isPlayer = true,
): Horse {
  const ownership = isPlayer ? makePlayerOwned() : makeNpcOwned("stable1");
  return {
    id,
    name: `Test Horse ${id}`,
    age,
    gender,
    raceHistory,
    ownership,
  } as Horse;
}

// Utility to create a mock race
function createMockRace(id: string, track: string): Race {
  return {
    id,
    graded: {
      track,
    },
  } as Race;
}

describe("Awards Scoring", () => {
  it("documents current behavior where South American 2YO awards ignore gender restrictions", () => {
    const raceMap = new Map<string, Race>([
      ["race1", createMockRace("race1", "Hipódromo de San Isidro")], // South America (Argentina)
    ]);

    // A 2YO filly wins a G1
    const filly = createMockHorse("filly1", 2, "filly", [
      {
        raceId: "race1",
        day: 100,
        position: 1,
        grade: "G1",
        distance: 2000,
        surface: "dirt",
      },
    ]);

    // A 2YO colt wins a G1
    const colt = createMockHorse("colt1", 2, "colt", [
      {
        raceId: "race1",
        day: 100,
        position: 1,
        grade: "G1",
        distance: 2000,
        surface: "dirt",
      },
    ]);

    // Filly gets points for potranca (filly)
    const fillyPotrancaPoints = calculateAwardPoints(
      filly,
      1,
      "south_america",
      "potranca_del_ano",
      raceMap,
    );

    // EXPECTED BEHAVIOR: Filly should get 0 points for potrillo (colt)
    // ACTUAL BEHAVIOR (BUG): She gets > 0 points because `potrillo_del_ano` only checks `age === 2`
    const fillyPotrilloPoints = calculateAwardPoints(
      filly,
      1,
      "south_america",
      "potrillo_del_ano",
      raceMap,
    );

    // Colt gets points for potrillo (colt)
    const coltPotrilloPoints = calculateAwardPoints(
      colt,
      1,
      "south_america",
      "potrillo_del_ano",
      raceMap,
    );

    // EXPECTED BEHAVIOR: Colt should get 0 points for potranca (filly)
    // ACTUAL BEHAVIOR (BUG): He gets > 0 points because `potranca_del_ano` only checks `age === 2`
    const coltPotrancaPoints = calculateAwardPoints(
      colt,
      1,
      "south_america",
      "potranca_del_ano",
      raceMap,
    );

    expect(fillyPotrancaPoints).toBeGreaterThan(0);
    expect(coltPotrilloPoints).toBeGreaterThan(0);

    // Documenting the bug: points are non-zero when they should be 0
    expect(fillyPotrilloPoints).toBe(fillyPotrancaPoints); // They get the exact same points for the wrong gender
    expect(coltPotrancaPoints).toBe(coltPotrilloPoints);
  });
});
