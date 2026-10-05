import { describe, it, expect } from "vitest";
import { calculateAwardPoints } from "@/core/awards/scoring";
import type { Horse, Race } from "@/game/types";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { REGIONAL_SCORING } from "@/core/awards/types";

describe("calculateAwardPoints scoring edge cases", () => {
  function mkRace(id: string): Race {
    return {
      id,
      name: `Race ${id}`,
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
        key: `key-${id}`,
        grade: "G1",
        track: "Churchill Downs",
        trackId: `track-${id}`,
        surface: "Dirt",
      },
    } as Race;
  }

  it("calculates exact points for various combinations of grades and beyers", () => {
    const race1 = mkRace("r1"); // G1 win, beyer 115
    const race2 = mkRace("r2"); // G2 win, beyer 105
    race2.graded!.grade = "G2";
    const race3 = mkRace("r3"); // Stakes win (Ungraded but has grade string), beyer 90
    race3.graded!.grade = "Listed" as any;
    const race4 = mkRace("r4"); // G3 place (position 3), beyer 100
    race4.graded!.grade = "G3";
    const race5 = mkRace("r5"); // Position 4 (no points), beyer 110

    const raceMap = new Map([race1, race2, race3, race4, race5].map((r) => [r.id, r]));

    const horse = createTestHorse({
      id: "h1",
      age: 3,
      gender: "colt",
      raceHistory: [
        {
          raceId: "r1",
          position: 1,
          beyer: 115,
          grade: "G1",
          day: 100,
          distance: 2000,
          surface: "Dirt",
          purse: 1,
          fieldSize: 8,
          raceName: "R1",
        },
        {
          raceId: "r2",
          position: 1,
          beyer: 105,
          grade: "G2",
          day: 100,
          distance: 2000,
          surface: "Dirt",
          purse: 1,
          fieldSize: 8,
          raceName: "R2",
        },
        {
          raceId: "r3",
          position: 1,
          beyer: 90,
          grade: "Listed",
          day: 100,
          distance: 2000,
          surface: "Dirt",
          purse: 1,
          fieldSize: 8,
          raceName: "R3",
        },
        {
          raceId: "r4",
          position: 3,
          beyer: 100,
          grade: "G3",
          day: 100,
          distance: 2000,
          surface: "Dirt",
          purse: 1,
          fieldSize: 8,
          raceName: "R4",
        },
        {
          raceId: "r5",
          position: 4,
          beyer: 110,
          grade: "G1",
          day: 100,
          distance: 2000,
          surface: "Dirt",
          purse: 1,
          fieldSize: 8,
          raceName: "R5",
        },
      ],
    });

    const points = calculateAwardPoints(horse, 1, "north_america", "horse_of_the_year", raceMap);

    const w = REGIONAL_SCORING["north_america"];

    let expected = 0;
    // r1: G1 win + Beyer 110+
    expected += w.G1_WIN + w.BEYER_110_PLUS;
    // r2: G2 win + Beyer 100+
    expected += w.G2_WIN + w.BEYER_100_PLUS;
    // r3: Stakes win (grade string exists but not G1/G2/G3) + No beyer bonus
    expected += w.STAKES_WIN;
    // r4: Graded place (pos 3) + Beyer 100+
    expected += w.GRADED_PLACE + w.BEYER_100_PLUS;
    // r5: Position 4 (no win/place points) + Beyer 110+
    expected += w.BEYER_110_PLUS;

    expect(points).toBe(expected);
  });
});
