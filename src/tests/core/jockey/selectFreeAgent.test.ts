import { describe, it, expect } from "vitest";
import { scoreJockeyChemistry, selectBestFreeAgentJockey } from "@/core/jockey/selectFreeAgent";
import { createTestHorse, createTestJockey } from "@/tests/helpers";

function mkHorse(overrides: Partial<ReturnType<typeof createTestHorse>> = {}) {
  return createTestHorse({ id: "horse-1", runningStyle: "P", ...overrides });
}

function mkJockey(overrides: Partial<ReturnType<typeof createTestJockey>> = {}) {
  return createTestJockey({
    id: "j1",
    fame: 50,
    archetype: "versatile",
    affinityMap: {},
    ...overrides,
  });
}

describe("scoreJockeyChemistry", () => {
  it("returns a finite number for any valid horse/jockey pair", () => {
    const horse = mkHorse();
    const jockey = mkJockey();
    const score = scoreJockeyChemistry(horse, jockey);
    expect(typeof score).toBe("number");
    expect(Number.isFinite(score)).toBe(true);
  });

  it("handles missing affinityMap entries (default empty object)", () => {
    const horse = mkHorse();
    const jockey = mkJockey({ affinityMap: {} });
    const score = scoreJockeyChemistry(horse, jockey);
    // versatile archetype → "High" compatibility (+20), no affinity
    expect(score).toBe(jockey.fame * 0.5 + 20);
  });

  it("adds affinity score from affinityMap[horseId]", () => {
    const horse = mkHorse();
    const jockeyWithAffinity = mkJockey({ affinityMap: { "horse-1": 300 } });
    const jockeyWithout = mkJockey({ affinityMap: {} });
    const scoreWith = scoreJockeyChemistry(horse, jockeyWithAffinity);
    const scoreWithout = scoreJockeyChemistry(horse, jockeyWithout);
    // 300/10 = 30 extra points
    expect(scoreWith - scoreWithout).toBe(30);
  });

  it("caps affinity contribution at 50", () => {
    const horse = mkHorse();
    const jockeyHigh = mkJockey({ affinityMap: { "horse-1": 2000 } });
    const jockeyCapped = mkJockey({ affinityMap: { "horse-1": 500 } });
    // 2000/10 = 200 → capped at 50; 500/10 = 50 → also 50
    expect(scoreJockeyChemistry(horse, jockeyHigh)).toBe(scoreJockeyChemistry(horse, jockeyCapped));
  });

  it("applies compatibility bonus for High match", () => {
    const horse = mkHorse({ runningStyle: "E" });
    const frontRunner = mkJockey({ archetype: "front_runner", fame: 50, affinityMap: {} });
    const closer = mkJockey({ archetype: "closer", fame: 50, affinityMap: {} });
    // E + front_runner = High (+20); E + closer = Poor (-15)
    expect(scoreJockeyChemistry(horse, frontRunner)).toBeGreaterThan(
      scoreJockeyChemistry(horse, closer),
    );
  });

  it("applies compatibility penalty for Poor match", () => {
    const horse = mkHorse({ runningStyle: "S" });
    const frontRunner = mkJockey({ archetype: "front_runner", fame: 50, affinityMap: {} });
    // S + front_runner = Poor (-15)
    const score = scoreJockeyChemistry(horse, frontRunner);
    expect(score).toBe(50 * 0.5 + 0 - 15);
  });
});

describe("selectBestFreeAgentJockey", () => {
  it("returns null when pool is empty", () => {
    const horse = mkHorse();
    expect(selectBestFreeAgentJockey(horse, [])).toBeNull();
  });

  it("returns the only jockey when pool has one entry", () => {
    const horse = mkHorse();
    const jockey = mkJockey({ fame: 10 });
    expect(selectBestFreeAgentJockey(horse, [jockey])).toBe(jockey);
  });

  it("selects higher fame when neither has affinity", () => {
    const horse = mkHorse({ runningStyle: "P" });
    const highFame = mkJockey({ id: "high", fame: 80, archetype: "versatile", affinityMap: {} });
    const lowFame = mkJockey({ id: "low", fame: 40, archetype: "versatile", affinityMap: {} });
    // Both versatile → High compat (+20 each), so fame is the tiebreaker
    expect(selectBestFreeAgentJockey(horse, [lowFame, highFame])).toBe(highFame);
  });

  it("selects jockey with affinity over higher-fame jockey with no affinity", () => {
    const horse = mkHorse({ runningStyle: "P" });
    const lowFameAffinity = mkJockey({
      id: "affinity",
      fame: 40,
      archetype: "versatile",
      affinityMap: { "horse-1": 500 },
    });
    const highFameNoAffinity = mkJockey({
      id: "no-affinity",
      fame: 90,
      archetype: "versatile",
      affinityMap: {},
    });
    // lowFame: 40*0.5 + 50 + 20(High) = 90
    // highFame: 90*0.5 + 0 + 20(High) = 65
    expect(selectBestFreeAgentJockey(horse, [highFameNoAffinity, lowFameAffinity])).toBe(
      lowFameAffinity,
    );
  });

  it("selects higher-fame jockey when both have low affinity", () => {
    const horse = mkHorse({ runningStyle: "P" });
    const highFameLowAffinity = mkJockey({
      id: "hf",
      fame: 90,
      archetype: "versatile",
      affinityMap: { "horse-1": 20 },
    });
    const lowFameLowAffinity = mkJockey({
      id: "lf",
      fame: 10,
      archetype: "versatile",
      affinityMap: { "horse-1": 20 },
    });
    // hf: 45 + 2 + 20 = 67; lf: 5 + 2 + 20 = 27
    expect(selectBestFreeAgentJockey(horse, [lowFameLowAffinity, highFameLowAffinity])).toBe(
      highFameLowAffinity,
    );
  });

  it("penalizes Poor compatibility: equal fame, High vs Poor", () => {
    const horse = mkHorse({ runningStyle: "E" });
    const highCompat = mkJockey({
      id: "high",
      fame: 50,
      archetype: "front_runner",
      affinityMap: {},
    });
    const poorCompat = mkJockey({ id: "poor", fame: 50, archetype: "closer", affinityMap: {} });
    // high: 25 + 0 + 20 = 45; poor: 25 + 0 - 15 = 10
    expect(selectBestFreeAgentJockey(horse, [poorCompat, highCompat])).toBe(highCompat);
  });

  it("High compatibility can overcome up to 20 fame difference vs Neutral", () => {
    const horse = mkHorse({ runningStyle: "E" });
    // E + front_runner = High (+20); E + finisher = Neutral (0)
    const highCompatLowerFame = mkJockey({
      id: "hc",
      fame: 60,
      archetype: "front_runner",
      affinityMap: {},
    });
    const neutralHigherFame = mkJockey({
      id: "n",
      fame: 80,
      archetype: "finisher",
      affinityMap: {},
    });
    // hc: 30 + 0 + 20 = 50; n: 40 + 0 + 0 = 40
    expect(selectBestFreeAgentJockey(horse, [neutralHigherFame, highCompatLowerFame])).toBe(
      highCompatLowerFame,
    );
  });
});

describe("scoreJockeyChemistry — trait awareness", () => {
  it("matching traits score higher than without (same fame/affinity/compat)", () => {
    const horse = mkHorse({ runningStyle: "E" });
    const baseProps = {
      fame: 50,
      archetype: "versatile" as const,
      affinityMap: {},
    };
    const noTraitJockey = mkJockey({ id: "j-no-trait", ...baseProps, traits: [] });
    const traitJockey = mkJockey({
      id: "j-trait",
      ...baseProps,
      traits: ["gate_master"],
    });
    // Both versatile → High compat (+20), same fame (25), same affinity (0)
    // traitJockey gets +10 for gate_master + E
    expect(scoreJockeyChemistry(horse, traitJockey)).toBeGreaterThan(
      scoreJockeyChemistry(horse, noTraitJockey),
    );
  });

  it("mismatched traits score lower (penalty)", () => {
    const horse = mkHorse({ runningStyle: "E" });
    const baseProps = {
      fame: 50,
      archetype: "versatile" as const,
      affinityMap: {},
    };
    const noTraitJockey = mkJockey({ id: "j-no-trait", ...baseProps, traits: [] });
    const mismatchJockey = mkJockey({
      id: "j-mis",
      ...baseProps,
      traits: ["closer_instinct"],
    });
    // Both versatile → High compat (+20), same fame (25), same affinity (0)
    // mismatchJockey gets -5 for closer_instinct + E
    expect(scoreJockeyChemistry(horse, mismatchJockey)).toBeLessThan(
      scoreJockeyChemistry(horse, noTraitJockey),
    );
  });
});
