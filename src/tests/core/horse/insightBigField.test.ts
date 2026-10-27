import { describe, it, expect } from "vitest";
import { detectBigFieldSpecialist } from "@/domains/horse/simulation/insightDetectors";
import type { Horse } from "@/domains/horse/simulation/types";

describe("detectBigFieldSpecialist", () => {
  it("detects a big field specialist", () => {
    const horse = {
      raceHistory: [
        { position: 1, beyer: 90, fieldSize: 14 },
        { position: 2, beyer: 88, fieldSize: 12 },
        { position: 3, beyer: 87, fieldSize: 12 },
        { position: 4, beyer: 80, fieldSize: 7 },
        { position: 5, beyer: 78, fieldSize: 6 },
        { position: 4, beyer: 82, fieldSize: 8 },
      ],
    } as unknown as Horse;

    const insight = detectBigFieldSpecialist(horse);
    expect(insight).toEqual({
      label: "Crowd Surfer",
      value: "Big Field Specialist",
      context: "Thrives in traffic, averaging a 88 Beyer in fields of 12+ vs 80 in smaller fields",
      type: "positive",
    });
  });

  it("returns null if win missing", () => {
    const horse = {
      raceHistory: [
        { position: 2, beyer: 90, fieldSize: 14 },
        { position: 2, beyer: 88, fieldSize: 12 },
        { position: 3, beyer: 87, fieldSize: 12 },
        { position: 4, beyer: 80, fieldSize: 7 },
        { position: 5, beyer: 78, fieldSize: 6 },
        { position: 4, beyer: 82, fieldSize: 8 },
      ],
    } as unknown as Horse;

    const insight = detectBigFieldSpecialist(horse);
    expect(insight).toBeNull();
  });
});
