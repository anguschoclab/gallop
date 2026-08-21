import { describe, it, expect } from "vitest";
import {
  calculateAutoRegisterEntries,
  calculateTransportCostForRace,
} from "@/core/campaign/autoRegister";
import type { Horse, Race, Jockey } from "@/game/types";
import { createTestHorse, createTestJockey } from "@/tests/helpers";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h1",
    name: "Test Horse",
    age: 4,
    gender: "horse",
    energy: 100,
    ownership: { type: "player" },
    lifecycleStatus: "active",
    ...overrides,
  });
}

function mkRace(overrides: Partial<Race> = {}): Race {
  const base: Race = {
    id: "r1",
    name: "Test Race",
    day: 10,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 300,
    purse: 6000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  };
  return { ...base, ...overrides };
}

function mkJockey(overrides: Partial<Jockey> = {}): Jockey {
  return createTestJockey({
    id: "j1",
    name: "Test Jockey",
    ridingFee: 100,
    fame: 50,
    archetype: "versatile",
    ...overrides,
  });
}

describe("calculateTransportCostForRace", () => {
  it("returns 150 for ungraded race", () => {
    expect(calculateTransportCostForRace(mkRace())).toBe(150);
  });

  it("returns 500 for G1", () => {
    expect(
      calculateTransportCostForRace(
        mkRace({ graded: { key: "g1test", grade: "G1", track: "T", surface: "Turf" } }),
      ),
    ).toBe(500);
  });

  it("returns 400 for G2", () => {
    expect(
      calculateTransportCostForRace(
        mkRace({ graded: { key: "g2test", grade: "G2", track: "T", surface: "Turf" } }),
      ),
    ).toBe(400);
  });

  it("returns 300 for G3", () => {
    expect(
      calculateTransportCostForRace(
        mkRace({ graded: { key: "g3test", grade: "G3", track: "T", surface: "Turf" } }),
      ),
    ).toBe(300);
  });
});

describe("calculateAutoRegisterEntries", () => {
  const baseDay = 5;

  it("returns entries when cash=$250k, entryFee=$300, jockeyFee=$100, transport=$150, minReserve=$5k", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries(
      [horse],
      [race],
      [jockey],
      250000,
      baseDay,
      7,
      5000,
    );
    expect(result.entries.length).toBe(1);
    expect(result.affordableCount).toBe(1);
  });

  it("skips horse with reason='Budget constraint' only when cash < entryFee + minReserve", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3, entryFee: 300 });
    const jockey = mkJockey({ ridingFee: 100 });
    // cash=500, entryFee=300, jockeyFee=100, transport=150 → total=550, 500-550=-50 < 5000
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 500, baseDay, 7, 5000);
    expect(result.entries.length).toBe(0);
    expect(result.skipped.some((s) => s.reason === "Budget constraint")).toBe(true);
  });

  it("returns affordableCount=0 when all races score <= 0 (not a cash problem)", () => {
    // Horse with very low stats vs high minStat → negative suitability score
    const horse = mkHorse({
      stats: {
        speed: 20,
        stamina: 20,
        acceleration: 20,
        consistency: 20,
        temperament: 20,
        conformation: 20,
      },
    });
    const race = mkRace({ day: baseDay + 3, minStat: 90 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries(
      [horse],
      [race],
      [jockey],
      250000,
      baseDay,
      7,
      5000,
    );
    expect(result.entries.length).toBe(0);
    expect(result.affordableCount).toBe(0);
    // The skip reason should be "No suitable races found", not "Budget constraint"
    expect(result.skipped.some((s) => s.reason === "No suitable races found")).toBe(true);
    expect(result.skipped.some((s) => s.reason === "Budget constraint")).toBe(false);
  });

  it("skips NPC-owned horses", () => {
    const horse = mkHorse({ ownership: { type: "npc", stableId: asNpcStableId("npc-stable") } });
    const race = mkRace({ day: baseDay + 3 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries.length).toBe(0);
    expect(result.skipped.length).toBe(0); // not even considered
  });

  it("skips horses with lifecycleStatus !== 'active'", () => {
    const horse = mkHorse({ lifecycleStatus: "retired" });
    const race = mkRace({ day: baseDay + 3 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries.length).toBe(0);
  });

  it("skips consigned horses (consignedSaleId set)", () => {
    const horse = mkHorse({ consignedSaleId: "sale-1" });
    const race = mkRace({ day: baseDay + 3 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries.length).toBe(0);
  });

  it("skips injured horses (activeInjury set)", () => {
    const horse = mkHorse({
      activeInjury: { type: "tendon", severity: "moderate", recoveryDays: 30, onsetDay: 1 },
    });
    const race = mkRace({ day: baseDay + 3 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries.length).toBe(0);
  });

  it("skips horses with energy < 50", () => {
    const horse = mkHorse({ energy: 49 });
    const race = mkRace({ day: baseDay + 3 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries.length).toBe(0);
  });

  it("skips horses already entered in any race", () => {
    const horse = mkHorse();
    const race = mkRace({
      day: baseDay + 3,
      entries: [{ horseId: "h1", ownership: { type: "player" } }],
    });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries.length).toBe(0);
  });

  it("respects daysAhead window — excludes race at day+8 when daysAhead=7", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 8 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay, 7);
    expect(result.entries.length).toBe(0);
    expect(result.skipped.some((s) => s.reason === "No suitable races found")).toBe(true);
  });

  it("skips resolved races", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3, resolved: true });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries.length).toBe(0);
  });

  it("skips full races (entries.length >= fieldSize)", () => {
    const horse = mkHorse();
    const race = mkRace({
      day: baseDay + 3,
      fieldSize: 2,
      entries: [
        { horseId: "npc1", ownership: { type: "unowned" } },
        { horseId: "npc2", ownership: { type: "unowned" } },
      ],
    });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries.length).toBe(0);
  });

  it("sorts candidates by suitability score descending", () => {
    const horse1 = mkHorse({
      id: "h1",
      name: "Strong",
      stats: {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
    });
    const horse2 = mkHorse({
      id: "h2",
      name: "Weak",
      stats: {
        speed: 50,
        stamina: 50,
        acceleration: 50,
        consistency: 50,
        temperament: 50,
        conformation: 50,
      },
    });
    const race1 = mkRace({ id: "r1", day: baseDay + 3, purse: 50000 });
    const race2 = mkRace({ id: "r2", day: baseDay + 4, purse: 5000 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries(
      [horse1, horse2],
      [race1, race2],
      [jockey],
      1000000,
      baseDay,
    );
    expect(result.entries.length).toBe(2);
    // Higher-rated horse should get the better race (higher purse → higher score)
    expect(result.entries[0].horseId).toBe("h1");
  });

  it("selects retained jockey (stableId='player') first", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3 });
    const retained = mkJockey({ id: "retained", stableId: "player", ridingFee: 200 });
    const freelance = mkJockey({ id: "freelance", ridingFee: 50, fame: 99 });
    const result = calculateAutoRegisterEntries(
      [horse],
      [race],
      [retained, freelance],
      100000,
      baseDay,
    );
    expect(result.entries[0].jockeyId).toBe("retained");
  });

  it("selects free-agent jockey by compatibility match (E→front_runner over closer)", () => {
    const horse = mkHorse({ runningStyle: "E" });
    const race = mkRace({ day: baseDay + 3 });
    const frontRunner = mkJockey({ id: "ft", archetype: "front_runner", fame: 30 });
    const closer = mkJockey({ id: "c", archetype: "closer", fame: 90 });
    const result = calculateAutoRegisterEntries(
      [horse],
      [race],
      [frontRunner, closer],
      100000,
      baseDay,
    );
    // E + front_runner = High (+20); E + closer = Poor (-15)
    // ft: 15 + 0 + 20 = 35; c: 45 + 0 - 15 = 30 → ft wins
    expect(result.entries[0].jockeyId).toBe("ft");
  });

  it("returns jockeyId=null when no jockeys available", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3 });
    const result = calculateAutoRegisterEntries([horse], [race], [], 100000, baseDay);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].jockeyId).toBe(null);
    expect(result.entries[0].jockeyFee).toBe(0);
  });

  it("respects MAX_HORSES_PER_STABLE_PER_RACE (skips 3rd entry in same race)", () => {
    const h1 = mkHorse({ id: "h1", name: "H1" });
    const h2 = mkHorse({ id: "h2", name: "H2" });
    const h3 = mkHorse({ id: "h3", name: "H3" });
    const race = mkRace({
      id: "r1",
      day: baseDay + 3,
      fieldSize: 14,
      entries: [
        { horseId: "h1", ownership: { type: "player" } },
        { horseId: "h2", ownership: { type: "player" } },
      ],
    });
    const jockey = mkJockey();
    // h1 and h2 are already entered → only h3 is eligible, but race already has 2 player entries
    const result = calculateAutoRegisterEntries([h1, h2, h3], [race], [jockey], 100000, baseDay);
    // h1 and h2 are already entered → skipped. h3 is eligible but race has 2 player entries (MAX_HORSES_PER_STABLE_PER_RACE=2)
    expect(result.entries.length).toBe(0);
  });

  it("calculates transportCost correctly for ungraded race", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3, entryFee: 300 });
    const jockey = mkJockey({ ridingFee: 100 });
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.entries[0].transportCost).toBe(150);
    expect(result.entries[0].entryFee).toBe(300);
    expect(result.entries[0].jockeyFee).toBe(100);
    expect(result.entries[0].totalCost).toBe(550);
  });

  it("remainingCash = cash - totalCost", () => {
    const horse = mkHorse();
    const race = mkRace({ day: baseDay + 3, entryFee: 300 });
    const jockey = mkJockey({ ridingFee: 100 });
    const result = calculateAutoRegisterEntries([horse], [race], [jockey], 100000, baseDay);
    expect(result.remainingCash).toBe(100000 - 550);
    expect(result.totalCost).toBe(550);
  });

  it("affordableCount = entries.length", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2" });
    const r1 = mkRace({ id: "r1", day: baseDay + 3 });
    const r2 = mkRace({ id: "r2", day: baseDay + 4 });
    const jockey = mkJockey();
    const result = calculateAutoRegisterEntries([h1, h2], [r1, r2], [jockey], 1000000, baseDay);
    expect(result.affordableCount).toBe(result.entries.length);
    expect(result.affordableCount).toBe(2);
  });

  it("selects free agent with affinity over higher-fame jockey (chemistry-aware)", () => {
    const horse = mkHorse({ id: "h1", runningStyle: "P" });
    const race = mkRace({ day: baseDay + 3 });
    const famousJockey = mkJockey({
      id: "j-famous",
      fame: 90,
      archetype: "versatile",
      affinityMap: {},
    });
    const affinityJockey = mkJockey({
      id: "j-affinity",
      fame: 30,
      archetype: "versatile",
      affinityMap: { h1: 500 },
    });
    const result = calculateAutoRegisterEntries(
      [horse],
      [race],
      [famousJockey, affinityJockey],
      100000,
      baseDay,
    );
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].jockeyId).toBe("j-affinity");
  });
});
