import { describe, it, expect } from "vitest";
import { ensureMaidenRaces, ensureMaidenInCard, ensure2yoRaces } from "@/core/race/maidenGuarantee";
import { createRng } from "@/core/common/rng";
import type { Race } from "@/game/types";
import type { Track } from "@/data/tracks";
import { TWOYO_DISTANCE_BANDS, TWOYO_AGE } from "@/constants";

function mkRace(overrides: Partial<Race> = {}): Race {
  const base: Race = {
    id: `r-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test Race",
    day: 5,
    distance: 1200,
    raceClass: "Allowance",
    entryFee: 300,
    purse: 6000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  };
  return { ...base, ...overrides };
}

function mkTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "test-track-1",
    name: "Test Track",
    country: "USA",
    courses: [
      {
        surface: "Dirt",
        circumference: 2000,
        straightLength: 400,
        sections: [
          { type: "straight", length: 400 },
          { type: "turn", length: 600, radius: 191 },
          { type: "straight", length: 400 },
          { type: "turn", length: 600, radius: 191 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("ensureMaidenRaces", () => {
  it("adds maiden when none exist for each day in range", () => {
    const races: Race[] = [mkRace({ day: 3, raceClass: "Allowance" })];
    const result = ensureMaidenRaces(races, 2, 7, createRng("test"));
    for (let d = 2; d <= 7; d++) {
      const dayRaces = result.filter((r) => r.day === d);
      const hasMaiden = dayRaces.some((r) => r.raceClass === "Maiden" && r.minStat === undefined);
      expect(hasMaiden).toBe(true);
    }
  });

  it("preserves existing starter-eligible maidens (no duplicate added)", () => {
    const existingMaiden = mkRace({ day: 4, raceClass: "Maiden" });
    const races: Race[] = [existingMaiden];
    const result = ensureMaidenRaces(races, 2, 7, createRng("test"));
    const day4Maidens = result.filter(
      (r) => r.day === 4 && r.raceClass === "Maiden" && r.minStat === undefined,
    );
    expect(day4Maidens.length).toBe(1);
  });

  it("skips days outside range", () => {
    const races: Race[] = [];
    const result = ensureMaidenRaces(races, 3, 5, createRng("test"));
    const day2Maidens = result.filter((r) => r.day === 2);
    const day6Maidens = result.filter((r) => r.day === 6);
    expect(day2Maidens.length).toBe(0);
    expect(day6Maidens.length).toBe(0);
    for (let d = 3; d <= 5; d++) {
      const hasMaiden = result.some(
        (r) => r.day === d && r.raceClass === "Maiden" && r.minStat === undefined,
      );
      expect(hasMaiden).toBe(true);
    }
  });

  it("added maiden has no minStat", () => {
    const races: Race[] = [];
    const result = ensureMaidenRaces(races, 2, 3, createRng("test"));
    const addedMaidens = result.filter((r) => r.raceClass === "Maiden" && !races.includes(r));
    for (const m of addedMaidens) {
      expect(m.minStat).toBeUndefined();
    }
  });

  it("added maiden has correct raceClass", () => {
    const races: Race[] = [];
    const result = ensureMaidenRaces(races, 2, 3, createRng("test"));
    const added = result.filter((r) => !races.includes(r));
    for (const m of added) {
      expect(m.raceClass).toBe("Maiden");
    }
  });

  it("adds maiden even when MaidenSpecialWeight (minStat=40) exists", () => {
    const races: Race[] = [mkRace({ day: 3, raceClass: "MaidenSpecialWeight", minStat: 40 })];
    const result = ensureMaidenRaces(races, 3, 3, createRng("test"));
    const day3Maidens = result.filter(
      (r) => r.day === 3 && r.raceClass === "Maiden" && r.minStat === undefined,
    );
    expect(day3Maidens.length).toBeGreaterThanOrEqual(1);
  });

  it("does not add maiden when MaidenClaiming (no minStat) already exists", () => {
    const races: Race[] = [mkRace({ day: 3, raceClass: "MaidenClaiming" })];
    const result = ensureMaidenRaces(races, 3, 3, createRng("test"));
    const day3NoMinStatMaidens = result.filter(
      (r) => r.day === 3 && r.raceClass.toLowerCase().includes("maiden") && r.minStat === undefined,
    );
    expect(day3NoMinStatMaidens.length).toBe(1);
  });
});

describe("ensureMaidenInCard", () => {
  it("adds maiden in winter (dayOfYear <= 60)", () => {
    const card: Race[] = [mkRace({ day: 30, raceClass: "Allowance" })];
    const track = mkTrack();
    const result = ensureMaidenInCard(card, 30, track, createRng("test"));
    const hasMaiden = result.some((r) => r.raceClass === "Maiden" && r.minStat === undefined);
    expect(hasMaiden).toBe(true);
  });

  it("no change after winter (dayOfYear > 60)", () => {
    const card: Race[] = [mkRace({ day: 100, raceClass: "Allowance" })];
    const track = mkTrack();
    const result = ensureMaidenInCard(card, 100, track, createRng("test"));
    expect(result).toEqual(card);
  });

  it("no change when starter-eligible maiden already present", () => {
    const existingMaiden = mkRace({ day: 30, raceClass: "Maiden" });
    const card: Race[] = [existingMaiden];
    const track = mkTrack();
    const result = ensureMaidenInCard(card, 30, track, createRng("test"));
    expect(result).toEqual(card);
  });

  it("added maiden has no minStat", () => {
    const card: Race[] = [mkRace({ day: 30, raceClass: "Stakes", minStat: 65 })];
    const track = mkTrack();
    const result = ensureMaidenInCard(card, 30, track, createRng("test"));
    const added = result.find((r) => r.raceClass === "Maiden" && !card.includes(r));
    expect(added).toBeDefined();
    expect(added!.minStat).toBeUndefined();
  });

  it("added maiden has correct trackId", () => {
    const card: Race[] = [mkRace({ day: 30, raceClass: "Allowance" })];
    const track = mkTrack({ id: "my-track-id" });
    const result = ensureMaidenInCard(card, 30, track, createRng("test"));
    const added = result.find((r) => r.raceClass === "Maiden" && !card.includes(r));
    expect(added).toBeDefined();
    expect(added!.trackId).toBe("my-track-id");
  });

  it("ensureMaidenRaces added maiden has no restrictions", () => {
    const races: Race[] = [];
    const result = ensureMaidenRaces(races, 2, 3, createRng("test"));
    const added = result.filter((r) => r.raceClass === "Maiden" && !races.includes(r));
    for (const m of added) {
      expect(m.restrictions).toBeUndefined();
    }
  });

  it("ensureMaidenInCard added maiden has no restrictions", () => {
    const card: Race[] = [mkRace({ day: 30, raceClass: "Allowance" })];
    const track = mkTrack();
    const result = ensureMaidenInCard(card, 30, track, createRng("test"));
    const added = result.find((r) => r.raceClass === "Maiden" && !card.includes(r));
    expect(added).toBeDefined();
    expect(added!.restrictions).toBeUndefined();
  });
});

describe("ensure2yoRaces", () => {
  it("adds 2yo races for all distance bands when none exist", () => {
    const races: Race[] = [];
    const result = ensure2yoRaces(races, 10, 10, createRng("test"));
    const day10Twoyo = result.filter(
      (r) => r.restrictions?.minAge === TWOYO_AGE && r.restrictions?.maxAge === TWOYO_AGE,
    );
    expect(day10Twoyo.length).toBeGreaterThanOrEqual(3);

    const bands = new Set(day10Twoyo.map((r) => getBandKey(r.distance)));
    for (const key of Object.keys(TWOYO_DISTANCE_BANDS)) {
      expect(bands.has(key as keyof typeof TWOYO_DISTANCE_BANDS)).toBe(true);
    }
  });

  it("does not add 2yo races when all bands already covered", () => {
    const existing: Race[] = [
      mkRace({
        day: 10,
        distance: 1200,
        raceClass: "MaidenSpecialWeight",
        restrictions: { minAge: TWOYO_AGE, maxAge: TWOYO_AGE },
      }),
      mkRace({
        day: 10,
        distance: 1600,
        raceClass: "MaidenSpecialWeight",
        restrictions: { minAge: TWOYO_AGE, maxAge: TWOYO_AGE },
      }),
      mkRace({
        day: 10,
        distance: 2000,
        raceClass: "MaidenSpecialWeight",
        restrictions: { minAge: TWOYO_AGE, maxAge: TWOYO_AGE },
      }),
    ];
    const result = ensure2yoRaces(existing, 10, 10, createRng("test"));
    expect(result.length).toBe(existing.length);
  });

  it("fills only missing bands", () => {
    const existing: Race[] = [
      mkRace({
        day: 10,
        distance: 1200,
        raceClass: "MaidenSpecialWeight",
        restrictions: { minAge: TWOYO_AGE, maxAge: TWOYO_AGE },
      }),
    ];
    const result = ensure2yoRaces(existing, 10, 10, createRng("test"));
    const added = result.filter((r) => !existing.includes(r));
    expect(added.length).toBe(2);

    const bands = new Set(added.map((r) => getBandKey(r.distance)));
    expect(bands.has("mile")).toBe(true);
    expect(bands.has("route")).toBe(true);
    expect(bands.has("sprint")).toBe(false);
  });

  it("skips days outside range", () => {
    const races: Race[] = [];
    const result = ensure2yoRaces(races, 10, 12, createRng("test"));
    const day9 = result.filter((r) => r.day === 9);
    const day13 = result.filter((r) => r.day === 13);
    expect(day9.length).toBe(0);
    expect(day13.length).toBe(0);
  });

  it("added 2yo races have correct restrictions", () => {
    const races: Race[] = [];
    const result = ensure2yoRaces(races, 10, 10, createRng("test"));
    const added = result.filter((r) => r.restrictions?.minAge === TWOYO_AGE);
    for (const r of added) {
      expect(r.restrictions?.minAge).toBe(TWOYO_AGE);
      expect(r.restrictions?.maxAge).toBe(TWOYO_AGE);
    }
  });

  it("added 2yo races have MaidenSpecialWeight class", () => {
    const races: Race[] = [];
    const result = ensure2yoRaces(races, 10, 10, createRng("test"));
    const added = result.filter((r) => !races.includes(r));
    for (const r of added) {
      expect(r.raceClass).toBe("MaidenSpecialWeight");
    }
  });

  it("does not treat open-age races as 2yo races", () => {
    const existing: Race[] = [
      mkRace({ day: 10, distance: 1200, raceClass: "Maiden" }),
      mkRace({ day: 10, distance: 1600, raceClass: "Allowance" }),
    ];
    const result = ensure2yoRaces(existing, 10, 10, createRng("test"));
    const added = result.filter((r) => !existing.includes(r));
    expect(added.length).toBe(3);
  });

  it("handles multi-day range", () => {
    const races: Race[] = [];
    const result = ensure2yoRaces(races, 10, 12, createRng("test"));
    for (let d = 10; d <= 12; d++) {
      const dayRaces = result.filter((r) => r.day === d);
      const twoyoRaces = dayRaces.filter(
        (r) => r.restrictions?.minAge === TWOYO_AGE && r.restrictions?.maxAge === TWOYO_AGE,
      );
      expect(twoyoRaces.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("preserves existing races", () => {
    const existing: Race[] = [mkRace({ day: 10, raceClass: "Stakes", distance: 1800 })];
    const result = ensure2yoRaces(existing, 10, 10, createRng("test"));
    expect(result).toContain(existing[0]);
  });
});

function getBandKey(distance: number): keyof typeof TWOYO_DISTANCE_BANDS {
  for (const [key, band] of Object.entries(TWOYO_DISTANCE_BANDS)) {
    if (distance >= band.min && distance <= band.max) {
      return key as keyof typeof TWOYO_DISTANCE_BANDS;
    }
  }
  return "sprint";
}
