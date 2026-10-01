import { describe, it, expect } from "vitest";
import { detectJockeyChemistry } from "@/core/horse/insightDetectors";
import type { Horse, HorseRaceHistoryEntry } from "@/core/horse/types";

describe("detectJockeyChemistry", () => {
  const createHorse = (history: Partial<HorseRaceHistoryEntry>[]): Horse => {
    return {
      raceHistory: history as HorseRaceHistoryEntry[],
    } as Horse;
  };

  it("returns null for empty history", () => {
    const horse = createHorse([]);
    expect(detectJockeyChemistry(horse)).toBeNull();
  });

  it("returns null for single entry", () => {
    const horse = createHorse([
      { jockeyId: "j1", position: 1 } as any,
    ]);
    expect(detectJockeyChemistry(horse)).toBeNull();
  });

  it("returns null if jockey has less than 3 starts", () => {
    const horse = createHorse([
      { jockeyId: "j1", position: 1 } as any,
      { jockeyId: "j1", position: 1 } as any,
    ]);
    expect(detectJockeyChemistry(horse)).toBeNull();
  });

  it("returns null if jockey has >= 3 starts but < 2 wins", () => {
    const horse = createHorse([
      { jockeyId: "j1", position: 1 } as any,
      { jockeyId: "j1", position: 2 } as any,
      { jockeyId: "j1", position: 3 } as any,
    ]);
    expect(detectJockeyChemistry(horse)).toBeNull();
  });

  it("returns insight if jockey has >= 3 starts and >= 2 wins and >= 50% win rate", () => {
    const horse = createHorse([
      { jockeyId: "j1", position: 1 } as any,
      { jockeyId: "j1", position: 1 } as any,
      { jockeyId: "j1", position: 2 } as any,
    ]);
    const insight = detectJockeyChemistry(horse);
    expect(insight).not.toBeNull();
    expect(insight?.jockeyId).toBe("j1");
    expect(insight?.context).toContain("Has won 2 of 3 starts (67%)");
  });

  it("handles tie cases correctly (favors jockey with higher win rate, or more starts)", () => {
    const horse = createHorse([
      // Jockey 1: 3 starts, 2 wins (67%)
      { jockeyId: "j1", position: 1 } as any,
      { jockeyId: "j1", position: 1 } as any,
      { jockeyId: "j1", position: 2 } as any,

      // Jockey 2: 4 starts, 3 wins (75%)
      { jockeyId: "j2", position: 1 } as any,
      { jockeyId: "j2", position: 1 } as any,
      { jockeyId: "j2", position: 1 } as any,
      { jockeyId: "j2", position: 2 } as any,
    ]);
    const insight = detectJockeyChemistry(horse);
    expect(insight).not.toBeNull();
    expect(insight?.jockeyId).toBe("j2");
    expect(insight?.context).toContain("Has won 3 of 4 starts (75%)");
  });

  it("tie breaker: same win rate, favors more starts", () => {
    const horse = createHorse([
      // Jockey 1: 3 starts, 2 wins (~67%)
      { jockeyId: "j1", position: 1 } as any,
      { jockeyId: "j1", position: 1 } as any,
      { jockeyId: "j1", position: 2 } as any,

      // Jockey 2: 6 starts, 4 wins (~67%)
      { jockeyId: "j2", position: 1 } as any,
      { jockeyId: "j2", position: 1 } as any,
      { jockeyId: "j2", position: 1 } as any,
      { jockeyId: "j2", position: 1 } as any,
      { jockeyId: "j2", position: 2 } as any,
      { jockeyId: "j2", position: 2 } as any,
    ]);
    const insight = detectJockeyChemistry(horse);
    expect(insight).not.toBeNull();
    expect(insight?.jockeyId).toBe("j2");
  });
});
