import { describe, it, expect } from "vitest";
import { raceFameGain } from "@/domains/prestige/simulation/raceFame";
import { rankedRacecourses } from "@/domains/prestige/simulation/racecoursePrestige";
import { generateFameImpact } from "@/domains/race/simulation/impacts/energyFormFame";
import { calculateRaceLossReputation } from "@/domains/reputation/model/reputationTypes";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

const g1 = (track: string) => ({ purse: 0, trackId: undefined, graded: { grade: "G1", track } });

describe("race fame scales with racecourse prestige", () => {
  it("a G1 win at a top course earns more than at an unknown course", () => {
    const top = rankedRacecourses()[0];
    const topRace = { purse: 0, trackId: top.id, graded: { grade: "G1" } };
    expect(raceFameGain(topRace, 1)).toBeGreaterThan(raceFameGain(g1("Nowhere Park"), 1));
  });

  it("G1 win at an unknown course = 17 (20 x floor multiplier)", () => {
    expect(raceFameGain(g1("Nowhere Park"), 1)).toBe(17);
  });

  it("player horses get the same venue-scaled fame as rivals", () => {
    const horse = createTestHorse();
    const race = g1("Nowhere Park");
    expect(generateFameImpact(horse, 1, 1, undefined, () => "x", "G1", race)?.delta).toBe(17);
  });
});

describe("race-loss reputation", () => {
  it("a 2nd place on debut in an ungraded race costs no reputation", () => {
    expect(calculateRaceLossReputation(undefined, 2, 8, 0)).toBe(0);
  });
});
