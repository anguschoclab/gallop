import { describe, it, expect } from "vitest";
import { getJockeyInsight } from "@/core/jockey/insights";
import type { Jockey, Horse } from "@/game/types";

describe("Tipster: Jockey Insights", () => {
  const createMockJockey = (id: string): Jockey => ({
    id,
    name: "Test Jockey",
    age: 25,
    archetype: "versatile",
    stats: { pacing: 50, positioning: 50, vigor: 50, gateSkill: 50, temperament: 50 },
    potential: 50,
    traits: [],
    silk: { pattern: "solid", primary: "#fff", secondary: "#000", cap: "#fff" },
    careerStarts: 0,
    careerWins: 0,
    fame: 0,
    ridingFee: 100,
    affinityMap: {},
    stableAffinity: 0,
    isApprentice: false,
    loyalty: 50,
  });

  const createMockHorse = (id: string, name: string, races: any[]): Horse =>
    ({
      id,
      name,
      raceHistory: races,
    }) as unknown as Horse;

  it("returns Favorite Mount insight when jockey has 3+ wins on a horse", () => {
    const jockey = createMockJockey("j1");
    const horses = {
      h1: createMockHorse("h1", "Thunder", [
        { jockeyId: "j1", position: 1 },
        { jockeyId: "j1", position: 1 },
        { jockeyId: "j1", position: 1 },
        { jockeyId: "j1", position: 2 },
      ]),
      h2: createMockHorse("h2", "Lightning", [
        { jockeyId: "j1", position: 1 },
        { jockeyId: "j1", position: 4 },
      ]),
    };

    const insight = getJockeyInsight(jockey, horses);
    expect(insight).toBeTruthy();
    expect(insight?.label).toBe("Favorite Mount");
    expect(insight?.value).toBe("Thunder");
    expect(insight?.context).toContain("Has won 3 races in 4 starts aboard this horse");
  });

  it("returns null if less than 5 races total", () => {
    const jockey = createMockJockey("j1");
    const horses = {
      h1: createMockHorse("h1", "Thunder", [
        { jockeyId: "j1", position: 1 },
        { jockeyId: "j1", position: 1 },
        { jockeyId: "j1", position: 1 },
      ]),
    };

    const insight = getJockeyInsight(jockey, horses);
    expect(insight).toBeNull();
  });
});
