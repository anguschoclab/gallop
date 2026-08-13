import { describe, it, expect } from "vitest";
import { selectHorsesForRaceEntry, runNpcRaceEntry } from "@/core/npc/raceEntry";
import { fillRaceWithFillerHorses } from "@/core/race/fieldManager";
import { updateHorseFame } from "@/core/npc/postRace";
import { createRng } from "@/core/common/rng";
import type { Horse, Race, Stable } from "@/game/types";
import type { StaffRole } from "@/core/staff/staffTypes";
import { createTestHorse, createTestJockey } from "@/tests/helpers";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: overrides.id ?? "h1",
    name: "Test Horse",
    sireName: "Test Sire",
    damName: "Test Dam",
    age: 4,
    gender: "colt",
    stats: {
      speed: 65,
      stamina: 65,
      acceleration: 65,
      consistency: 65,
      temperament: 65,
      conformation: 65,
    },
    ...overrides,
  });
}

function mkStable(overrides: Partial<Stable> = {}): Stable {
  const staffRoles: StaffRole[] = ["veterinarian", "farrier", "nutritionist", "groom", "trainer"];
  const staff: Record<StaffRole, string | null> = staffRoles.reduce(
    (acc, role) => ({ ...acc, [role]: null }),
    {} as Record<StaffRole, string | null>,
  );

  return {
    id: "s1",
    name: "Test Stable",
    owner: "Owner",
    tier: "mid",
    reputation: 70,
    founded: 1,
    cash: 200000,
    horses: ["h1", "h2"],
    isMajor: true,
    colors: { primary: "#000", secondary: "#fff" },
    country: "USA",
    personality: "conservative",
    staff,
    outposts: [],
    ...overrides,
  };
}

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: overrides.id ?? "r1",
    name: "Test Race",
    day: overrides.day ?? 5,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 200,
    purse: 8000,
    fieldSize: 10,
    entries: overrides.entries ?? [],
    resolved: false,
    ...overrides,
  };
}

describe("selectHorsesForRaceEntry", () => {
  it("returns empty array when stable has no horses", () => {
    const stable = mkStable({ horses: [] });
    const result = selectHorsesForRaceEntry(stable, new Map(), mkRace(), new Set());
    expect(result).toHaveLength(0);
  });

  it("returns at most 2 horses (MAX_HORSES_PER_STABLE_PER_RACE)", () => {
    const horses = [
      mkHorse({ id: "h1", stableId: "s1" }),
      mkHorse({ id: "h2", stableId: "s1" }),
      mkHorse({ id: "h3", stableId: "s1" }),
    ];
    const horseMap = new Map(horses.map((h) => [h.id, h]));
    const stable = mkStable({ horses: ["h1", "h2", "h3"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set());
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("does not enter horses with energy < 50", () => {
    const lowEnergy = mkHorse({ id: "h1", energy: 40, stableId: "s1" });
    const horseMap = new Map([["h1", lowEnergy]]);
    const stable = mkStable({ horses: ["h1"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set());
    expect(result).toHaveLength(0);
  });

  it("does not enter pregnant horses", () => {
    const horse = mkHorse({ id: "h1", stableId: "s1", energy: 80 });
    const horseMap = new Map([["h1", horse]]);
    const stable = mkStable({ horses: ["h1"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set(["h1"]));
    expect(result).toHaveLength(0);
  });

  it("does not enter horses already in race", () => {
    const horse = mkHorse({ id: "h1", stableId: "s1", energy: 80 });
    const horseMap = new Map([["h1", horse]]);
    const race = mkRace({ entries: [{ horseId: "h1", owned: false, stableId: "s1", npc: true }] });
    const stable = mkStable({ horses: ["h1"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, race, new Set());
    expect(result).toHaveLength(0);
  });

  it("selects horses sorted by score descending", () => {
    // Create horses with different stats that will result in different suitability scores
    // Higher stats should result in higher scores for the same race
    const highStatHorse = mkHorse({
      id: "h1",
      stableId: "s1",
      energy: 80,
      stats: {
        speed: 85,
        stamina: 85,
        acceleration: 85,
        consistency: 85,
        temperament: 85,
        conformation: 85,
      },
    });
    const midStatHorse = mkHorse({
      id: "h2",
      stableId: "s1",
      energy: 80,
      stats: {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 70,
        conformation: 70,
      },
    });
    const lowStatHorse = mkHorse({
      id: "h3",
      stableId: "s1",
      energy: 80,
      stats: {
        speed: 55,
        stamina: 55,
        acceleration: 55,
        consistency: 55,
        temperament: 55,
        conformation: 55,
      },
    });

    const horseMap = new Map([
      ["h1", highStatHorse],
      ["h2", midStatHorse],
      ["h3", lowStatHorse],
    ]);
    const stable = mkStable({ horses: ["h1", "h2", "h3"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set());

    // Should select top 2 by score
    expect(result.length).toBe(2);
    // The highest stat horse should be selected
    expect(result.some((h) => h.id === "h1")).toBe(true);
  });

  it("handles mixed eligibility - some horses eligible, some not", () => {
    const eligibleHorse = mkHorse({ id: "h1", stableId: "s1", energy: 80 });
    const ineligibleEnergy = mkHorse({ id: "h2", stableId: "s1", energy: 30 });
    const ineligiblePregnant = mkHorse({ id: "h3", stableId: "s1", energy: 80 });

    const horseMap = new Map([
      ["h1", eligibleHorse],
      ["h2", ineligibleEnergy],
      ["h3", ineligiblePregnant],
    ]);
    const stable = mkStable({ horses: ["h1", "h2", "h3"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set(["h3"]));

    // Only eligible horse should be selected
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h1");
  });

  it("skips horses not found in horseMap", () => {
    const horse = mkHorse({ id: "h1", stableId: "s1", energy: 80 });
    const horseMap = new Map([["h1", horse]]);
    // Stable references a horse ID that doesn't exist in the map
    const stable = mkStable({ horses: ["h1", "h2", "h3"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set());

    // Should only enter the horse that exists in the map
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h1");
  });

  it("returns empty array when all horses are ineligible", () => {
    const horses = [
      mkHorse({ id: "h1", stableId: "s1", energy: 30 }),
      mkHorse({ id: "h2", stableId: "s1", energy: 40 }),
      mkHorse({ id: "h3", stableId: "s1", energy: 45 }),
    ];
    const horseMap = new Map(horses.map((h) => [h.id, h]));
    const stable = mkStable({ horses: ["h1", "h2", "h3"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set());
    expect(result).toHaveLength(0);
  });

  it("respects MAX_HORSES_PER_STABLE_PER_RACE even with more eligible horses", () => {
    const horses = Array.from({ length: 5 }, (_, i) =>
      mkHorse({ id: `h${i}`, stableId: "s1", energy: 80 }),
    );
    const horseMap = new Map(horses.map((h) => [h.id, h]));
    const stable = mkStable({ horses: horses.map((h) => h.id) });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set());

    // Should return at most 2 horses even though 5 are eligible
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("does not enter consigned horses", () => {
    const consignedHorse = mkHorse({
      id: "h1",
      stableId: "s1",
      energy: 80,
      consignedSaleId: "sale-1",
    });
    const normalHorse = mkHorse({ id: "h2", stableId: "s1", energy: 80 });

    const horseMap = new Map([
      ["h1", consignedHorse],
      ["h2", normalHorse],
    ]);
    const stable = mkStable({ horses: ["h1", "h2"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set());

    // Only the non-consigned horse should be selected
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h2");
  });

  it("handles horses with very low form", () => {
    const lowFormHorse = mkHorse({ id: "h1", stableId: "s1", energy: 80, form: -10 });
    const normalFormHorse = mkHorse({ id: "h2", stableId: "s1", energy: 80, form: 5 });

    const horseMap = new Map([
      ["h1", lowFormHorse],
      ["h2", normalFormHorse],
    ]);
    const stable = mkStable({ horses: ["h1", "h2"] });
    const result = selectHorsesForRaceEntry(stable, horseMap, mkRace(), new Set());

    // Low form horse should be filtered out by shouldEnterHorse
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h2");
  });
});

describe("runNpcRaceEntry", () => {
  it("does not modify races beyond currentDay + daysAhead", () => {
    const farRace = mkRace({ id: "far", day: 100 });
    const stables = [mkStable()];
    const horses = [mkHorse({ id: "h1", stableId: "s1", energy: 80 })];
    const result = runNpcRaceEntry(stables, horses, [], [farRace], 1, createRng("test"), 3);
    expect(result.find((r) => r.id === "far")!.entries).toHaveLength(0);
  });

  it("skips races that are already full", () => {
    const fullRace = mkRace({
      id: "full",
      day: 3,
      fieldSize: 1,
      entries: [{ horseId: "h99", owned: false, stableId: "s99", npc: true }],
    });
    const stables = [mkStable()];
    const horses = [mkHorse({ id: "h1", stableId: "s1", energy: 80 })];
    const result = runNpcRaceEntry(stables, horses, [], [fullRace], 1, createRng("test"), 3);
    expect(result.find((r) => r.id === "full")!.entries).toHaveLength(1); // unchanged
  });

  it("skips resolved races", () => {
    const resolved = mkRace({ id: "res", day: 3, resolved: true });
    const stables = [mkStable()];
    const horses = [mkHorse({ id: "h1", stableId: "s1" })];
    const result = runNpcRaceEntry(stables, horses, [], [resolved], 1, createRng("test"), 3);
    expect(result.find((r) => r.id === "res")!.entries).toHaveLength(0);
  });

  it("returns same number of races as input", () => {
    const races = [mkRace({ id: "r1", day: 2 }), mkRace({ id: "r2", day: 4 })];
    const result = runNpcRaceEntry([], [], [], races, 1, createRng("test"), 3);
    expect(result).toHaveLength(races.length);
  });

  it("selects free agent with affinity over higher-fame jockey (chemistry-aware)", () => {
    const horse = mkHorse({ id: "h1", stableId: "s1", energy: 80, runningStyle: "P" });
    const race = mkRace({ id: "r1", day: 2, fieldSize: 10 });
    const stable = mkStable({ horses: ["h1"] });

    const famousJockey = createTestJockey({
      id: "j-famous",
      name: "Famous",
      fame: 80,
      archetype: "versatile",
      affinityMap: {},
      lastRaceDay: 0,
    });
    const affinityJockey = createTestJockey({
      id: "j-affinity",
      name: "Affinity",
      fame: 30,
      archetype: "versatile",
      affinityMap: { h1: 500 },
      lastRaceDay: 0,
    });

    const result = runNpcRaceEntry([stable], [horse], [famousJockey, affinityJockey], [race], 1, createRng("test"), 3);
    const entry = result.find((r) => r.id === "r1")!.entries.find((e) => e.horseId === "h1");
    expect(entry).toBeDefined();
    expect(entry!.jockeyId).toBe("j-affinity");
  });
});

describe("fillRaceWithFillerHorses", () => {
  it("does not add already-entered horses", () => {
    const horse = mkHorse({ id: "h1", stableId: "s1", owned: false, energy: 80 });
    const race = mkRace({
      entries: [{ horseId: "h1", owned: false, stableId: "s1", npc: true }],
      fieldSize: 5,
    });
    const { updatedRace } = fillRaceWithFillerHorses(race, [mkStable()], [horse], 3);
    expect(
      updatedRace.entries.every(
        (e) =>
          e.horseId !== "h1" || updatedRace.entries.filter((x) => x.horseId === "h1").length === 1,
      ),
    ).toBe(true);
  });

  it("does not exceed fieldSize", () => {
    const horses = Array.from({ length: 20 }, (_, i) =>
      mkHorse({ id: `h${i}`, stableId: "s1", owned: false, energy: 80 }),
    );
    const race = mkRace({ fieldSize: 5, entries: [] });
    const { updatedRace } = fillRaceWithFillerHorses(race, [mkStable()], horses, 5);
    expect(updatedRace.entries.length).toBeLessThanOrEqual(5);
  });

  it("returns newHorses as empty array (no fresh generation in fill function)", () => {
    const { newHorses } = fillRaceWithFillerHorses(mkRace(), [], [], 2);
    expect(newHorses).toEqual([]);
  });
});

describe("updateHorseFame", () => {
  it("race with no result → horses unchanged", () => {
    const horse = mkHorse({ id: "h1", fame: 10 });
    const race = mkRace({ result: undefined });
    const result = updateHorseFame([horse], race);
    expect(result[0].fame).toBe(10);
  });

  it("non-graded win (position=1) → +5 fame", () => {
    const horse = mkHorse({ id: "h1", fame: 10 });
    const race = mkRace({ result: [{ horseId: "h1", position: 1, time: 95 }] });
    const result = updateHorseFame([horse], race);
    expect(result[0].fame).toBe(15);
  });

  it("G1 win → +20 fame", () => {
    const horse = mkHorse({ id: "h1", fame: 10 });
    const race = mkRace({
      result: [{ horseId: "h1", position: 1, time: 95 }],
      graded: { key: "g1", grade: "G1", track: "Ascot", trackId: "t1", surface: "Turf" },
    });
    const result = updateHorseFame([horse], race);
    expect(result[0].fame).toBe(30);
  });

  it("G2 win → +15 fame", () => {
    const horse = mkHorse({ id: "h1", fame: 5 });
    const race = mkRace({
      result: [{ horseId: "h1", position: 1, time: 95 }],
      graded: { key: "g2", grade: "G2", track: "Newmarket", trackId: "t2", surface: "Turf" },
    });
    const result = updateHorseFame([horse], race);
    expect(result[0].fame).toBe(20);
  });

  it("position > 5 → 0 fame gain", () => {
    const horse = mkHorse({ id: "h1", fame: 10 });
    const race = mkRace({ result: [{ horseId: "h1", position: 6, time: 100 }] });
    const result = updateHorseFame([horse], race);
    expect(result[0].fame).toBe(10);
  });

  it("fame is capped at 100", () => {
    const horse = mkHorse({ id: "h1", fame: 95 });
    const race = mkRace({
      result: [{ horseId: "h1", position: 1, time: 95 }],
      graded: { key: "g1", grade: "G1", track: "Ascot", trackId: "t1", surface: "Turf" },
    });
    const result = updateHorseFame([horse], race);
    expect(result[0].fame).toBeLessThanOrEqual(100);
  });

  it("horse not in result → fame unchanged", () => {
    const horse = mkHorse({ id: "other", fame: 20 });
    const race = mkRace({ result: [{ horseId: "h1", position: 1, time: 95 }] });
    const result = updateHorseFame([horse], race);
    expect(result[0].fame).toBe(20);
  });
});
