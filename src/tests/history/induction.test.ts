import { describe, it, expect } from "vitest";
import { checkHallOfFameInduction } from "@/services/history/historyService";
import { Horse } from "@/game/types";

describe("Hall of Fame Induction", () => {
  const baseHorse: Partial<Horse> = {
    id: "legend-1",
    name: "Secretariat",
    lifetimeEarnings: 0,
    careerWins: 0,
    careerStarts: 0,
    raceHistory: [],
    sireName: "Bold Ruler",
    damName: "Somethingroyal",
    silk: "#ff0000",
  };

  it("should not induct a horse with no achievements", () => {
    const entry = checkHallOfFameInduction(baseHorse as Horse, 100);
    expect(entry).toBeNull();
  });

  it("should induct a horse with 3+ G1 wins", () => {
    const horse = {
      ...baseHorse,
      raceHistory: [
        { grade: "G1", position: 1, day: 10 },
        { grade: "G1", position: 1, day: 20 },
        { grade: "G1", position: 1, day: 30 },
      ],
    } as Horse;

    const entry = checkHallOfFameInduction(horse, 40);
    expect(entry).not.toBeNull();
    expect(entry?.name).toBe("Secretariat");
    expect(entry?.g1Wins).toBe(3);
  });

  it("should induct a horse with $1,000,000 in earnings", () => {
    const horse = {
      ...baseHorse,
      lifetimeEarnings: 1200000,
      raceHistory: [{ grade: "G1", position: 1, day: 10 }],
    } as Horse;

    const entry = checkHallOfFameInduction(horse, 40);
    expect(entry).not.toBeNull();
    expect(entry?.achievements).toContain("$1.2M in Lifetime Earnings");
  });

  it("should include correct pedigree and silk", () => {
    const horse = {
      ...baseHorse,
      lifetimeEarnings: 2000000,
    } as Horse;

    const entry = checkHallOfFameInduction(horse, 100);
    expect(entry?.pedigree.sireName).toBe("Bold Ruler");
    expect(entry?.silk).toBe("#ff0000");
  });
});
