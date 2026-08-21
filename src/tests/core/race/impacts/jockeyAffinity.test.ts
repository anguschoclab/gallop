import { describe, it, expect } from "vitest";
import { generateJockeyAffinityImpact } from "@/core/race/impacts/jockeyAffinity";
import { AFFINITY_CONSTANTS } from "@/core/jockey/affinity";
import { createTestJockey, createTestHorse } from "@/tests/helpers";
import type { Jockey, JockeyTrait } from "@/core/jockey/types";
import type { Horse, Race } from "@/game/types";

function mkJockey(overrides: Partial<Jockey> = {}): Jockey {
  return createTestJockey({ id: "j1", affinityMap: {}, ...overrides });
}

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({ id: "h1", runningStyle: "P", ...overrides });
}

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 5,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 500,
    purse: 10000,
    minStat: 70,
    fieldSize: 8,
    entries: [{ horseId: "h1", jockeyId: "j1", ownership: { type: "player" } } as any],
    resolved: false,
    surface: "Turf",
    trackCondition: "good",
    weather: "sunny",
    ...overrides,
  } as Race;
}

describe("generateJockeyAffinityImpact — trait synergy", () => {
  it("matching trait-horse pair yields >50% more XP than no traits", () => {
    const horse = mkHorse({ id: "h1", runningStyle: "E" });
    const race = mkRace();
    const baseJockey = mkJockey({ id: "j-base", traits: [] as JockeyTrait[] });
    const traitJockey = mkJockey({ id: "j-trait", traits: ["gate_master"] as JockeyTrait[] });

    const baseImpact = generateJockeyAffinityImpact(horse, baseJockey, 3, race, 80, 100);
    const traitImpact = generateJockeyAffinityImpact(horse, traitJockey, 3, race, 80, 100);

    // gate_master + E → 1.5x multiplier → 50% more XP
    expect(traitImpact.xp).toBeGreaterThan(baseImpact.xp * 1.49);
  });

  it("non-matching trait-horse pair yields same XP as no traits", () => {
    const horse = mkHorse({ id: "h1", runningStyle: "S" });
    const race = mkRace();
    const baseJockey = mkJockey({ id: "j-base", traits: [] as JockeyTrait[] });
    const mismatchJockey = mkJockey({ id: "j-mis", traits: ["gate_master"] as JockeyTrait[] });

    const baseImpact = generateJockeyAffinityImpact(horse, baseJockey, 3, race, 80, 100);
    const mismatchImpact = generateJockeyAffinityImpact(horse, mismatchJockey, 3, race, 80, 100);

    expect(mismatchImpact.xp).toBe(baseImpact.xp);
  });

  it("win bonus + trait synergy stack correctly", () => {
    const horse = mkHorse({ id: "h1", runningStyle: "E" });
    const race = mkRace();
    const traitJockey = mkJockey({ id: "j-trait", traits: ["gate_master"] as JockeyTrait[] });

    const winImpact = generateJockeyAffinityImpact(horse, traitJockey, 1, race, 80, 100);
    // Base XP = 20, win bonus = 10 → 30, * 1.5 = 45
    expect(winImpact.xp).toBeGreaterThanOrEqual(
      Math.round((AFFINITY_CONSTANTS.XP_PER_RACE + AFFINITY_CONSTANTS.XP_PER_WIN_BONUS) * 1.5),
    );
  });

  it("poor race penalty still applies with traits", () => {
    const horse = mkHorse({ id: "h1", runningStyle: "E" });
    const race = mkRace({ fieldSize: 8, entries: Array(8).fill({}) as any });
    const traitJockey = mkJockey({ id: "j-trait", traits: ["gate_master"] as JockeyTrait[] });

    const poorImpact = generateJockeyAffinityImpact(horse, traitJockey, 11, race, 50, 100);
    // Base XP = 20 + penalty (-10) = 10, * 1.5 = 15
    // Should be less than base XP * 1.5 (20 * 1.5 = 30) due to penalty
    expect(poorImpact.xp).toBeLessThan(AFFINITY_CONSTANTS.XP_PER_RACE * 1.5);
  });
});
