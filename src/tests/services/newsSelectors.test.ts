import { describe, it, expect } from "vitest";
import {
  getEliteMajorStables,
  getNpcHorses,
  getNpcHorsesByRating,
  getG1RacesByDay,
  getGradedRacesByDay,
  getVeteransByFame,
} from "@/services/narrative/newsSelectors";
import { createTestStable, createTestHorse, createTestNpcHorse } from "@/tests/helpers";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import type { Race, Stable, Horse } from "@/game/types";

function buildStables(): Stable[] {
  return [
    createTestStable({ id: "s1", name: "Alpha", tier: "elite", isMajor: true, reputation: 70 }),
    createTestStable({ id: "s2", name: "Beta", tier: "elite", isMajor: true, reputation: 95 }),
    createTestStable({ id: "s3", name: "Gamma", tier: "elite", isMajor: true, reputation: 85 }),
    createTestStable({
      id: "s4",
      name: "Minor Elite",
      tier: "elite",
      isMajor: false,
      reputation: 90,
    }),
    createTestStable({ id: "s5", name: "Mid Major", tier: "mid", isMajor: true, reputation: 80 }),
    createTestStable({ id: "s6", name: "Budget", tier: "budget", isMajor: false, reputation: 30 }),
  ];
}

function buildHorses(): Horse[] {
  return [
    createTestNpcHorse({
      id: "h1",
      name: "Fast",
      ownership: makeNpcOwned(asNpcStableId("s1")),
      stats: {
        speed: 90,
        stamina: 80,
        acceleration: 85,
        consistency: 75,
        temperament: 50,
        conformation: 50,
      },
      age: 3,
      fame: 60,
    }),
    createTestNpcHorse({
      id: "h2",
      name: "Steady",
      ownership: makeNpcOwned(asNpcStableId("s1")),
      stats: {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      age: 7,
      fame: 90,
    }),
    createTestHorse({
      id: "h3",
      name: "Player",
      ownership: makePlayerOwned(),
      age: 4,
      fame: 99,
    }),
    createTestNpcHorse({
      id: "h4",
      name: "Old Vet",
      ownership: makeNpcOwned(asNpcStableId("s1")),
      stats: {
        speed: 60,
        stamina: 60,
        acceleration: 60,
        consistency: 60,
        temperament: 50,
        conformation: 50,
      },
      age: 8,
      fame: 75,
    }),
  ];
}

function buildRaces(): Race[] {
  const mk = (id: string, day: number, grade?: "G1" | "G2" | "G3"): Race =>
    ({
      id,
      name: `Race ${id}`,
      day,
      distance: 2000,
      raceClass: "Stakes",
      entryFee: 500,
      purse: 100000,
      fieldSize: 8,
      entries: [],
      resolved: false,
      graded: grade ? { key: `g-${id}`, grade, track: "Track", surface: "Dirt" } : undefined,
    }) as Race;
  return [
    mk("r1", 10, "G2"),
    mk("r2", 5, "G1"),
    mk("r3", 3, "G1"),
    mk("r4", 20, "G3"),
    mk("r5", 8), // non-graded
  ];
}

describe("newsSelectors", () => {
  describe("getEliteMajorStables", () => {
    it("returns only elite+major stables sorted by reputation desc", () => {
      const result = getEliteMajorStables(buildStables());
      expect(result.map((s) => s.id)).toEqual(["s2", "s3", "s1"]);
      expect(result.every((s) => s.tier === "elite" && s.isMajor)).toBe(true);
    });

    it("cache hit returns the same cached array instance", () => {
      const stables = buildStables();
      const first = getEliteMajorStables(stables);
      const second = getEliteMajorStables(stables);
      expect(second).toBe(first);
    });

    it("cache miss: new array reference produces a fresh sorted copy", () => {
      const a = getEliteMajorStables(buildStables());
      const b = getEliteMajorStables(buildStables());
      expect(b).not.toBe(a);
      expect(b.map((s) => s.id)).toEqual(a.map((s) => s.id));
    });

    it("empty input returns empty array without throwing", () => {
      expect(getEliteMajorStables([])).toEqual([]);
    });
  });

  describe("getNpcHorses", () => {
    it("returns only NPC-owned horses (excludes player-owned)", () => {
      const result = getNpcHorses(buildHorses());
      expect(result.map((h) => h.id).sort()).toEqual(["h1", "h2", "h4"]);
      expect(result.every((h) => !("playerOwned" in h && h.playerOwned))).toBe(true);
    });

    it("cache hit returns the same cached array instance", () => {
      const horses = buildHorses();
      expect(getNpcHorses(horses)).toBe(getNpcHorses(horses));
    });

    it("empty input returns empty array", () => {
      expect(getNpcHorses([])).toEqual([]);
    });
  });

  describe("getNpcHorsesByRating", () => {
    it("returns NPC horses with ratings sorted by rating desc", () => {
      const result = getNpcHorsesByRating(buildHorses());
      // h1: (90+80+85+75)/4 = 82.5 -> round 83; h2: 70; h4: 60
      expect(result.map((r) => r.horse.id)).toEqual(["h1", "h2", "h4"]);
      expect(result[0].rating).toBeGreaterThanOrEqual(result[1].rating);
    });

    it("cache hit returns the same cached array instance", () => {
      const horses = buildHorses();
      expect(getNpcHorsesByRating(horses)).toBe(getNpcHorsesByRating(horses));
    });

    it("empty input returns empty array", () => {
      expect(getNpcHorsesByRating([])).toEqual([]);
    });
  });

  describe("getG1RacesByDay", () => {
    it("returns only G1 races sorted by day asc", () => {
      const result = getG1RacesByDay(buildRaces());
      expect(result.map((r) => r.id)).toEqual(["r3", "r2"]);
      expect(result.every((r) => r.graded?.grade === "G1")).toBe(true);
    });

    it("cache hit returns the same cached array instance", () => {
      const races = buildRaces();
      expect(getG1RacesByDay(races)).toBe(getG1RacesByDay(races));
    });

    it("empty input returns empty array", () => {
      expect(getG1RacesByDay([])).toEqual([]);
    });
  });

  describe("getGradedRacesByDay", () => {
    it("returns all graded races sorted by day asc", () => {
      const result = getGradedRacesByDay(buildRaces());
      expect(result.map((r) => r.id)).toEqual(["r3", "r2", "r1", "r4"]);
      expect(result.every((r) => r.graded)).toBe(true);
    });

    it("cache hit returns the same cached array instance", () => {
      const races = buildRaces();
      expect(getGradedRacesByDay(races)).toBe(getGradedRacesByDay(races));
    });

    it("empty input returns empty array", () => {
      expect(getGradedRacesByDay([])).toEqual([]);
    });
  });

  describe("getVeteransByFame", () => {
    it("returns veterans (age >= 6) sorted by fame desc", () => {
      const result = getVeteransByFame(buildHorses());
      // h2 (age 7, fame 90), h4 (age 8, fame 75); h1 age 3, h3 age 4 excluded
      expect(result.map((h) => h.id)).toEqual(["h2", "h4"]);
      expect(result.every((h) => h.age >= 6)).toBe(true);
    });

    it("cache hit returns the same cached array instance", () => {
      const horses = buildHorses();
      expect(getVeteransByFame(horses)).toBe(getVeteransByFame(horses));
    });

    it("empty input returns empty array", () => {
      expect(getVeteransByFame([])).toEqual([]);
    });
  });
});
