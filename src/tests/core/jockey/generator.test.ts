import { describe, it, expect } from "vitest";
import { generateJockey, generateApprentice } from "@/domains/jockey/simulation/generator";
import { createRng } from "@/shared/common/rng";
import { JOCKEY_SALARY_ELITE_MIN, JOCKEY_SALARY_ELITE_MAX, JOCKEY_SALARY_MID_MIN, JOCKEY_SALARY_MID_MAX, JOCKEY_SALARY_BUDGET_MIN, JOCKEY_SALARY_BUDGET_MAX } from "@/domains/jockey/model/jockeyConstants";;
import type { JockeyTrait } from "@/domains/jockey/model/types";

const VALID_TRAITS: JockeyTrait[] = [
  "bullring_expert",
  "hill_specialist",
  "long_straight_pro",
  "gate_master",
  "turf_specialist",
  "dirt_specialist",
  "mud_master",
  "sprint_specialist",
  "staying_specialist",
  "pace_presser",
  "big_match_temperament",
  "veteran_poise",
  "closer_instinct",
];

describe("generateJockey — trait assignment", () => {
  it("front_runner gets gate_master as primary trait", () => {
    // Run multiple seeds to find a front_runner
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(seed);
      const j = generateJockey({ rng });
      if (j.archetype === "front_runner") {
        expect(j.traits).toContain("gate_master");
        return;
      }
    }
    expect.fail("No front_runner generated in 100 seeds");
  });

  it("closer gets hill_specialist as primary trait", () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(seed);
      const j = generateJockey({ rng });
      if (j.archetype === "closer") {
        expect(j.traits).toContain("hill_specialist");
        return;
      }
    }
    expect.fail("No closer generated in 100 seeds");
  });

  it("clinical gets bullring_expert as primary trait", () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(seed);
      const j = generateJockey({ rng });
      if (j.archetype === "clinical") {
        expect(j.traits).toContain("bullring_expert");
        return;
      }
    }
    expect.fail("No clinical generated in 100 seeds");
  });

  it("finisher gets long_straight_pro as primary trait", () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(seed);
      const j = generateJockey({ rng });
      if (j.archetype === "finisher") {
        expect(j.traits).toContain("long_straight_pro");
        return;
      }
    }
    expect.fail("No finisher generated in 100 seeds");
  });

  it("all assigned traits are valid JockeyTrait values", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(seed);
      const j = generateJockey({ rng });
      for (const trait of j.traits) {
        expect(VALID_TRAITS).toContain(trait);
      }
    }
  });

  it("no duplicate traits assigned", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(seed);
      const j = generateJockey({ rng });
      const unique = new Set(j.traits);
      expect(unique.size).toBe(j.traits.length);
    }
  });

  it("elite jockeys can get more than one trait", () => {
    let foundMulti = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(seed);
      const j = generateJockey({ tier: "elite", rng });
      if (j.traits.length > 1) {
        foundMulti = true;
        break;
      }
    }
    expect(foundMulti).toBe(true);
  });

  it("versatile archetype can get traits", () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(seed);
      const j = generateJockey({ rng });
      if (j.archetype === "versatile") {
        // Versatile may or may not get a trait, but if it does, it should be valid
        for (const trait of j.traits) {
          expect(VALID_TRAITS).toContain(trait);
        }
        return;
      }
    }
    expect.fail("generateJockey did not produce a versatile archetype in 200 seeds");
  });
});

describe("generateJockey — tier storage", () => {
  it("stores tier: 'elite' when generated with tier elite", () => {
    const rng = createRng(42);
    const j = generateJockey({ tier: "elite", rng });
    expect(j.tier).toBe("elite");
  });

  it("stores tier: 'mid' when generated with tier mid", () => {
    const rng = createRng(42);
    const j = generateJockey({ tier: "mid", rng });
    expect(j.tier).toBe("mid");
  });

  it("stores tier: 'budget' when generated with tier budget", () => {
    const rng = createRng(42);
    const j = generateJockey({ tier: "budget", rng });
    expect(j.tier).toBe("budget");
  });

  it("defaults to tier: 'mid' when no tier specified", () => {
    const rng = createRng(42);
    const j = generateJockey({ rng });
    expect(j.tier).toBe("mid");
  });

  it("generateApprentice stores tier: 'budget'", () => {
    const rng = createRng(42);
    const j = generateApprentice({ rng });
    expect(j.tier).toBe("budget");
  });
});

describe("generateJockey — tier stat bounds", () => {
  // Archetype strategies adjust base rolls by up to +20 / -10.
  const bounds = {
    elite: { min: JOCKEY_SALARY_ELITE_MIN, max: JOCKEY_SALARY_ELITE_MAX },
    mid: { min: JOCKEY_SALARY_MID_MIN, max: JOCKEY_SALARY_MID_MAX },
    budget: { min: JOCKEY_SALARY_BUDGET_MIN, max: JOCKEY_SALARY_BUDGET_MAX },
  } as const;

  for (const tier of ["elite", "mid", "budget"] as const) {
    it(`${tier} jockey stats stay within tier bounds plus archetype deltas`, () => {
      const { min, max } = bounds[tier];
      for (let seed = 0; seed < 50; seed++) {
        const j = generateJockey({ tier, rng: createRng(seed) });
        for (const s of Object.values(j.stats)) {
          expect(s).toBeGreaterThanOrEqual(min - 10);
          expect(s).toBeLessThanOrEqual(Math.min(100, max + 20));
        }
      }
    });
  }
});
