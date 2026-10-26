import { describe, it, expect } from "vitest";
import { detectFieldSizeAffinity } from "@/domains/horse/simulation/insightDetectors";
import type { Horse } from "@/domains/horse/simulation/types";

describe("detectFieldSizeAffinity", () => {
  it("returns null if not enough starts", () => {
    const horse = {
      raceHistory: [{ position: 1, beyer: 80, fieldSize: 10, day: 1, raceId: "1", raceName: "a" }],
    } as unknown as Horse;
    expect(detectFieldSizeAffinity(horse)).toBeNull();
  });

  it("detects Traffic Weaver (large field preference)", () => {
    const horse = {
      raceHistory: [
        { position: 1, beyer: 80, fieldSize: 10, day: 1, raceId: "1", raceName: "a" },
        { position: 1, beyer: 82, fieldSize: 11, day: 2, raceId: "2", raceName: "b" },
        { position: 1, beyer: 85, fieldSize: 12, day: 3, raceId: "3", raceName: "c" },
        { position: 5, beyer: 70, fieldSize: 6, day: 4, raceId: "4", raceName: "d" },
        { position: 6, beyer: 72, fieldSize: 7, day: 5, raceId: "5", raceName: "e" },
        { position: 4, beyer: 68, fieldSize: 5, day: 6, raceId: "6", raceName: "f" },
      ],
    } as unknown as Horse;

    const insight = detectFieldSizeAffinity(horse);
    expect(insight?.label).toBe("Traffic Weaver");
    expect(insight?.type).toBe("positive");
  });

  it("detects Needs Room (small field preference)", () => {
    const horse = {
      raceHistory: [
        { position: 1, beyer: 70, fieldSize: 10, day: 1, raceId: "1", raceName: "a" },
        { position: 1, beyer: 72, fieldSize: 11, day: 2, raceId: "2", raceName: "b" },
        { position: 1, beyer: 68, fieldSize: 12, day: 3, raceId: "3", raceName: "c" },
        { position: 5, beyer: 80, fieldSize: 6, day: 4, raceId: "4", raceName: "d" },
        { position: 6, beyer: 82, fieldSize: 7, day: 5, raceId: "5", raceName: "e" },
        { position: 4, beyer: 85, fieldSize: 5, day: 6, raceId: "6", raceName: "f" },
      ],
    } as unknown as Horse;

    const insight = detectFieldSizeAffinity(horse);
    expect(insight?.label).toBe("Needs Room");
    expect(insight?.type).toBe("neutral");
  });
});
