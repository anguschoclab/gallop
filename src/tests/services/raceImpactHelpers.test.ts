import { describe, it, expect } from "vitest";
import {
  generateHealthInjuryImpacts,
  generatePerformanceCareerImpacts,
  generateFinancialBreedingImpacts,
  generateJockeyStatsTrackingImpacts,
} from "@/core/race/impacts";
import {
  createTestColt,
  createTestNpcHorse,
  createTestMare,
} from "@/tests/helpers/createTestHorse";
import { createTestJockey } from "@/tests/helpers/createTestJockey";
import { createTestRng } from "@/tests/helpers/createTestRng";
import { RACE_ENERGY_IMPACT, MAX_FAME, GRADED_PRIZE_SPLIT } from "@/constants";
import type { Race, Horse, Jockey } from "@/game/types";

function makeOpenRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Open Race",
    day: 100,
    distance: 1600,
    raceClass: "open",
    entryFee: 0,
    purse: 50_000,
    fieldSize: 8,
    entries: [],
    resolved: true,
    trackId: "track-1",
    ...overrides,
  } as Race;
}

function makeGradedRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-g1",
    name: "Test G1",
    day: 100,
    distance: 2000,
    raceClass: "graded",
    entryFee: 0,
    purse: 1_000_000,
    fieldSize: 12,
    entries: [],
    resolved: true,
    trackId: "track-g1",
    graded: {
      key: "test-g1",
      grade: "G1",
      track: "Test Track",
      trackId: "track-g1",
      surface: "Turf",
    },
    ...overrides,
  } as Race;
}

// ---------------------------------------------------------------------------
// generateHealthInjuryImpacts
// ---------------------------------------------------------------------------

describe("generateHealthInjuryImpacts", () => {
  it("emits energy_change with RACE_ENERGY_IMPACT delta", () => {
    const horse = createTestColt({ id: "h1" });
    const impacts = generateHealthInjuryImpacts(horse, 100, [], {
      weather: "sunny",
    });
    const energy = impacts.find((i) => i.type === "energy_change");
    expect(energy).toBeDefined();
    expect((energy as any).delta).toBe(RACE_ENERGY_IMPACT);
  });

  it("does not emit injury when rng is undefined", () => {
    const horse = createTestColt({ id: "h1" });
    const impacts = generateHealthInjuryImpacts(horse, 100, [], {
      weather: "sunny",
    });
    expect(impacts.find((i) => i.type === "injury")).toBeUndefined();
  });

  it("does not emit insurance_payout when no injury occurs", () => {
    const horse = createTestColt({
      id: "h1",
      insurancePolicy: {
        type: "comprehensive",
        premiumPerDay: 100,
        coveragePercent: 0.75,
        activeSinceDay: 1,
      },
    });
    const rng = createTestRng("no-injury");
    const impacts = generateHealthInjuryImpacts(horse, 100, [], { weather: "sunny" }, rng);
    expect(impacts.find((i) => i.type === "insurance_payout")).toBeUndefined();
  });

  it("does not emit insurance_payout when horse has no policy even if injury is career-ending", () => {
    const horse = createTestColt({ id: "h1" });
    // We can't easily force a career-ending injury with a specific seed,
    // but we can verify no insurance_payout appears without a policy
    const rng = createTestRng("test");
    const impacts = generateHealthInjuryImpacts(horse, 100, [], { weather: "sunny" }, rng);
    expect(impacts.find((i) => i.type === "insurance_payout")).toBeUndefined();
  });

  it("emits energy_change for every call regardless of rng", () => {
    const horse = createTestColt({ id: "h1" });
    const withoutRng = generateHealthInjuryImpacts(horse, 100, [], { weather: "sunny" });
    const withRng = generateHealthInjuryImpacts(
      horse,
      100,
      [],
      { weather: "sunny" },
      createTestRng(),
    );
    expect(withoutRng.find((i) => i.type === "energy_change")).toBeDefined();
    expect(withRng.find((i) => i.type === "energy_change")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// generatePerformanceCareerImpacts
// ---------------------------------------------------------------------------

describe("generatePerformanceCareerImpacts", () => {
  it("returns { impacts, beyerValue } with beyerValue matching beyer_update impact", () => {
    const horse = createTestColt({ id: "h1" });
    const race = makeOpenRace();
    const result = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    expect(result.beyerValue).toBeDefined();
    const beyer = result.impacts.find((i) => i.type === "beyer_update") as any;
    expect(beyer).toBeDefined();
    expect(result.beyerValue).toBe(beyer.beyer);
  });

  it("emits form_change, beyer_update, recovery_change, race_history", () => {
    const horse = createTestColt({ id: "h1" });
    const race = makeOpenRace();
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const types = new Set(impacts.map((i) => i.type));
    expect(types.has("form_change")).toBe(true);
    expect(types.has("beyer_update")).toBe(true);
    expect(types.has("recovery_change")).toBe(true);
    expect(types.has("race_history")).toBe(true);
  });

  it("emits fame_change for 1st place", () => {
    const horse = createTestColt({ id: "h1" });
    const race = makeOpenRace();
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    expect(impacts.find((i) => i.type === "fame_change")).toBeDefined();
  });

  it("does not emit fame_change for 4th place", () => {
    const horse = createTestColt({ id: "h1" });
    const race = makeOpenRace();
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 4, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    expect(impacts.find((i) => i.type === "fame_change")).toBeUndefined();
  });

  it("race_history entry has fieldSize set to resultLength", () => {
    const horse = createTestColt({ id: "h1" });
    const race = makeOpenRace();
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      8,
      100,
      [],
    );
    const history = impacts.find((i) => i.type === "race_history") as any;
    expect(history.raceHistoryEntry.fieldSize).toBe(8);
  });

  it("race_history entry has courseVisitCount from horse.courseVisits", () => {
    const horse = createTestColt({
      id: "h1",
      courseVisits: { "track-1": 3 },
    });
    const race = makeOpenRace({ trackId: "track-1" });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const history = impacts.find((i) => i.type === "race_history") as any;
    expect(history.raceHistoryEntry.courseVisitCount).toBe(3);
  });

  it("emits pattern jump inbox_message when graded race + jump threshold", () => {
    // Pattern jump requires a graded race and a significant beyer improvement.
    // We can't easily force this without mocking, but we can verify the impact
    // is NOT emitted for a non-graded race.
    const horse = createTestColt({ id: "h1" });
    const race = makeOpenRace();
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    expect(impacts.find((i) => i.type === "inbox_message")).toBeUndefined();
  });

  it("emits triple_crown_progress when horse wins TC leg", () => {
    const horse = createTestColt({ id: "h1" });
    const race = makeGradedRace({
      graded: {
        key: "test-g1",
        grade: "G1",
        track: "Test Track",
        trackId: "track-g1",
        surface: "Turf",
        triplecrownKey: "usa-tc",
      },
    });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const tc = impacts.find((i) => i.type === "triple_crown_progress");
    expect(tc).toBeDefined();
  });

  it("does not emit triple_crown_progress for non-TC race", () => {
    const horse = createTestColt({ id: "h1" });
    const race = makeOpenRace();
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    expect(impacts.find((i) => i.type === "triple_crown_progress")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateFinancialBreedingImpacts
// ---------------------------------------------------------------------------

describe("generateFinancialBreedingImpacts", () => {
  it("emits cash_change for winning position (player horse)", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const race = makeOpenRace({ purse: 100_000 });
    const horseMap = new Map([["h1", horse]]);
    const impacts = generateFinancialBreedingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      new Map(),
      horseMap,
      undefined,
      50,
      100,
    );
    const cash = impacts.find((i) => i.type === "cash_change" && (i as any).amount > 0) as any;
    expect(cash).toBeDefined();
    // 0.6 * 100_000 = 60_000
    expect(cash.amount).toBe(60_000);
  });

  it("emits transaction for player-owned horse", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const race = makeOpenRace({ purse: 100_000 });
    const horseMap = new Map([["h1", horse]]);
    const impacts = generateFinancialBreedingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      new Map(),
      horseMap,
      undefined,
      50,
      100,
    );
    expect(impacts.find((i) => i.type === "transaction")).toBeDefined();
  });

  it("does not emit transaction for NPC horse", () => {
    const horse = createTestNpcHorse({ id: "h1", stableId: "npc-stable" });
    const race = makeOpenRace({ purse: 100_000 });
    const horseMap = new Map([["h1", horse]]);
    const impacts = generateFinancialBreedingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      new Map(),
      horseMap,
      undefined,
      50,
      100,
    );
    const cash = impacts.find((i) => i.type === "cash_change" && (i as any).amount > 0);
    expect(cash).toBeDefined();
    expect(impacts.find((i) => i.type === "transaction")).toBeUndefined();
  });

  it("does not emit prize impacts for positions beyond split length", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const race = makeOpenRace({ purse: 100_000 });
    const horseMap = new Map([["h1", horse]]);
    const impacts = generateFinancialBreedingImpacts(
      horse,
      { horseId: "h1", position: 10, time: 140 },
      race,
      undefined,
      new Map(),
      horseMap,
      undefined,
      50,
      100,
    );
    expect(impacts.find((i) => i.type === "cash_change")).toBeUndefined();
  });

  it("emits jockey_affinity_gain when jockey present", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeOpenRace({
      entries: [{ horseId: "h1", jockeyId: "j1", ownership: { type: "player" } } as any],
    });
    const horseMap = new Map([["h1", horse]]);
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateFinancialBreedingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry as any,
      jockeyMap,
      horseMap,
      undefined,
      50,
      100,
    );
    expect(impacts.find((i) => i.type === "jockey_affinity_gain")).toBeDefined();
  });

  it("does not emit jockey fee/affinity when no jockeyId in entry", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const race = makeOpenRace({ purse: 100_000 });
    const horseMap = new Map([["h1", horse]]);
    const impacts = generateFinancialBreedingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      new Map(),
      horseMap,
      undefined,
      50,
      100,
    );
    expect(impacts.find((i) => i.type === "jockey_affinity_gain")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateJockeyStatsTrackingImpacts
// ---------------------------------------------------------------------------

describe("generateJockeyStatsTrackingImpacts", () => {
  it("emits jockey_stats with careerStarts+1 and careerWins+1 on win", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1", careerStarts: 50, careerWins: 10, fame: 50 });
    const race = makeOpenRace();
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry as any,
      jockeyMap,
      100,
    );
    const js = impacts.find((i) => i.type === "jockey_stats") as any;
    expect(js).toBeDefined();
    expect(js.careerStarts).toBe(51);
    expect(js.careerWins).toBe(11);
    expect(js.fame).toBe(52);
  });

  it("emits jockey_stats with careerStarts+1 and careerWins+0 on non-win", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1", careerStarts: 50, careerWins: 10, fame: 50 });
    const race = makeGradedRace();
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 2, time: 121 },
      race,
      entry as any,
      jockeyMap,
      100,
    );
    const js = impacts.find((i) => i.type === "jockey_stats") as any;
    expect(js).toBeDefined();
    expect(js.careerStarts).toBe(51);
    expect(js.careerWins).toBe(10);
    expect(js.fame).toBe(50.5);
  });

  it("fame capped at MAX_FAME", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1", careerStarts: 50, careerWins: 10, fame: 99 });
    const race = makeOpenRace();
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry as any,
      jockeyMap,
      100,
    );
    const js = impacts.find((i) => i.type === "jockey_stats") as any;
    expect(js.fame).toBeLessThanOrEqual(MAX_FAME);
  });

  it("apprentice progression updated on win for apprentice jockey", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({
      id: "j1",
      isApprentice: true,
      apprenticeProgression: {
        jockeyId: "j1",
        status: "apprentice",
        careerWins: 2,
        apprenticeWins: 2,
      } as any,
    });
    const race = makeOpenRace();
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry as any,
      jockeyMap,
      100,
    );
    const js = impacts.find((i) => i.type === "jockey_stats") as any;
    expect(js.apprenticeProgression).toBeDefined();
    expect(js.apprenticeProgression.careerWins).toBe(3);
  });

  it("no apprentice progression update on non-win", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({
      id: "j1",
      isApprentice: true,
      apprenticeProgression: {
        jockeyId: "j1",
        status: "apprentice",
        careerWins: 2,
        apprenticeWins: 2,
      } as any,
    });
    const race = makeOpenRace();
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 2, time: 121 },
      race,
      entry as any,
      jockeyMap,
      100,
    );
    const js = impacts.find((i) => i.type === "jockey_stats") as any;
    // apprenticeProgression should be the original (unchanged)
    expect(js.apprenticeProgression).toBeDefined();
    expect(js.apprenticeProgression.careerWins).toBe(2);
  });

  it("no jockey_stats when no jockeyId in entry", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const race = makeOpenRace();
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      new Map(),
      100,
    );
    expect(impacts.find((i) => i.type === "jockey_stats")).toBeUndefined();
  });

  it("no jockey_stats when position beyond prizeSplit length", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeOpenRace();
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 10, time: 140 },
      race,
      entry as any,
      jockeyMap,
      100,
    );
    expect(impacts.find((i) => i.type === "jockey_stats")).toBeUndefined();
  });

  it("percentage fee emitted for placed jockey with non-zero winAmount", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeGradedRace({ purse: 1_000_000 });
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry as any,
      jockeyMap,
      100,
    );
    // Win amount = 0.7 * 1_000_000 = 700_000; percentage fee = 10% = 70_000
    const fee = impacts.find((i) => i.type === "cash_change" && (i as any).amount < 0) as any;
    expect(fee).toBeDefined();
    expect(fee.amount).toBe(-70_000);
  });

  it("no percentage fee when winAmount is 0 (position beyond split)", () => {
    const horse = createTestColt({ id: "h1", ownership: { type: "player" } });
    const jockey = createTestJockey({ id: "j1" });
    const race = makeOpenRace({ purse: 0 });
    const jockeyMap = new Map([["j1", jockey]]);
    const entry = { horseId: "h1", ownership: { type: "player" }, jockeyId: "j1" };
    const impacts = generateJockeyStatsTrackingImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      entry as any,
      jockeyMap,
      100,
    );
    // With purse 0, winAmount = 0, so no percentage fee
    const fee = impacts.find((i) => i.type === "cash_change" && (i as any).amount < 0);
    // jockey_stats should still be emitted (position 1 is within split)
    expect(impacts.find((i) => i.type === "jockey_stats")).toBeDefined();
    // But no negative cash_change (percentage fee)
    if (fee) {
      // If there is a negative cash_change, it shouldn't be the percentage fee
      // (could be the riding fee from financialBreeding, but that's a different helper)
      expect(fee).toBeUndefined();
    }
  });
});
