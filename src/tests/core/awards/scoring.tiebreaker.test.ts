import { describe, it, expect } from "vitest";
import { determineRegionalWinners } from "@/core/awards/scoring";
import type { Horse, Race } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkRace(
  id: string,
  track: string,
  surface: "Dirt" | "Turf" | "Synthetic",
  distance: number,
  day: number = 100,
  grade: string = "G1",
): Race {
  return {
    id,
    name: `Race ${id}`,
    day,
    distance,
    raceClass: "Graded",
    entryFee: 500,
    purse: 1000000,
    minStat: 80,
    fieldSize: 8,
    entries: [],
    resolved: true,
    graded: {
      key: `key-${id}`,
      grade: grade as any,
      track,
      trackId: `track-${id}`,
      surface,
    },
  } as Race;
}

describe("determineRegionalWinners - tiebreaker", () => {
  it("resolves ties non-deterministically based on array insertion order", () => {
    // Current implementation: candidates.sort((a, b) => b.points - a.points);
    // There is no explicit tiebreaker in scoring.ts, so ties are resolved by Array.prototype.sort's stability.

    const race1 = mkRace("r1", "Churchill Downs", "Dirt", 2000, 100, "G1");
    const race2 = mkRace("r2", "Churchill Downs", "Dirt", 2000, 110, "G1");
    const raceMap = new Map([[race1.id, race1], [race2.id, race2]]);

    // Both have identical points (G1 Win + 115 Beyer = 16 points)
    const h1 = createTestHorse({
      id: "h1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      raceHistory: [
        {
          raceId: "r1",
          raceName: "G1 Race 1",
          position: 1,
          day: 100,
          beyer: 115,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 1000000, // h1 wins a 1M purse
          fieldSize: 8,
        },
      ],
    });

    const h2 = createTestHorse({
      id: "h2",
      name: "Horse 2",
      age: 3,
      gender: "colt",
      raceHistory: [
        {
          raceId: "r2",
          raceName: "G1 Race 2",
          position: 1,
          day: 110,
          beyer: 115,
          grade: "G1",
          distance: 2000,
          surface: "Dirt",
          purse: 5000000, // h2 wins a 5M purse
          fieldSize: 8,
        },
      ],
    });

    // If we pass [h1, h2], h1 wins the tie.
    const winnersForward = determineRegionalWinners([h1, h2], 1, "north_america", raceMap);
    const hotyForward = winnersForward.find(w => w.category === "horse_of_the_year");
    expect(hotyForward?.points).toBe(16);
    expect(hotyForward?.runnerUpPoints).toBe(16);
    expect(hotyForward?.horseId).toBe("h1"); // Due to stable sort lacking a real tiebreaker

    // If we pass [h2, h1], h2 wins the tie.
    const winnersReverse = determineRegionalWinners([h2, h1], 1, "north_america", raceMap);
    const hotyReverse = winnersReverse.find(w => w.category === "horse_of_the_year");
    expect(hotyReverse?.points).toBe(16);
    expect(hotyReverse?.runnerUpPoints).toBe(16);
    expect(hotyReverse?.horseId).toBe("h2"); // Demonstrates the bug: non-deterministic relative to game state
  });
});
