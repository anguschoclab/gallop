import { describe, it, expect } from "vitest";
import { getFilteredRaces, getRacesByTrack, getRacesByMonth } from "@/services/race/raceFilterService";
import type { Race } from "@/game/types";

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: overrides.id ?? "r1",
    name: "Test Race",
    day: overrides.day ?? 10,
    distance: 1600,
    raceClass: overrides.raceClass ?? "Allowance",
    entryFee: 300,
    purse: 6000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    graded: overrides.graded,
    ...overrides,
  };
}

const races: Race[] = [
  mkRace({ id: "a", day: 5, raceClass: "Maiden" }),
  mkRace({
    id: "b",
    day: 15,
    raceClass: "Stakes",
    graded: { key: "g2", grade: "G2", track: "Ascot", trackId: "t1", surface: "Turf" },
  }),
  mkRace({
    id: "c",
    day: 25,
    raceClass: "Group",
    graded: { key: "g1", grade: "G1", track: "Newmarket", trackId: "t2", surface: "Turf" },
  }),
  mkRace({
    id: "d",
    day: 35,
    raceClass: "Allowance",
    graded: { key: "g3", grade: "G3", track: "Ascot", trackId: "t3", surface: "Turf" },
  }),
];

const deps = { races, currentDay: 20 };

describe("getFilteredRaces", () => {
  it("upcoming sorted ascending by day", () => {
    const { upcoming } = getFilteredRaces(deps, {});
    const days = upcoming.map((r) => r.day);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThanOrEqual(days[i - 1]);
    }
  });

  it("past sorted descending by day", () => {
    const { past } = getFilteredRaces(deps, {});
    const days = past.map((r) => r.day);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeLessThanOrEqual(days[i - 1]);
    }
  });

  it("day < currentDay → past; day >= currentDay → upcoming", () => {
    const { upcoming, past } = getFilteredRaces(deps, {});
    expect(past.map((r) => r.id)).toContain("a"); // day 5 < 20 → past
    expect(past.map((r) => r.id)).toContain("b"); // day 15 < 20 → past
    expect(upcoming.map((r) => r.id)).toContain("c"); // day 25 >= 20 → upcoming
    expect(upcoming.map((r) => r.id)).toContain("d"); // day 35 >= 20 → upcoming
  });

  it("grade filter restricts to matching grade", () => {
    const { upcoming, past } = getFilteredRaces(deps, { grade: "G1" });
    const all = [...upcoming, ...past];
    expect(all.every((r) => r.graded?.grade === "G1")).toBe(true);
  });

  it("no filters → all races returned across upcoming+past", () => {
    const { upcoming, past } = getFilteredRaces(deps, {});
    expect(upcoming.length + past.length).toBe(races.length);
  });
});

describe("getRacesByTrack", () => {
  it("groups by race.graded.track", () => {
    const groups = getRacesByTrack(deps, {});
    expect(groups).toHaveProperty("Ascot");
    expect(groups).toHaveProperty("Newmarket");
  });

  it("non-graded races go under 'Other'", () => {
    const groups = getRacesByTrack(deps, {});
    expect(groups).toHaveProperty("Other");
    expect(groups["Other"].some((r) => r.raceClass === "Maiden")).toBe(true);
  });

  it("races within each track group are sorted by day ascending", () => {
    const groups = getRacesByTrack(deps, {});
    for (const [, groupRaces] of Object.entries(groups)) {
      const days = groupRaces.map((r) => r.day);
      for (let i = 1; i < days.length; i++) {
        expect(days[i]).toBeGreaterThanOrEqual(days[i - 1]);
      }
    }
  });
});

describe("getRacesByMonth", () => {
  it("groups races by 30-day buckets", () => {
    // days 1–30 → month 1 (January), 31–60 → month 2 (February)
    const monthRaces = [mkRace({ id: "m1", day: 10 }), mkRace({ id: "m2", day: 40 })];
    const groups = getRacesByMonth({ races: monthRaces, currentDay: 1 }, {});
    expect(groups).toHaveProperty("January");
    expect(groups).toHaveProperty("February");
  });

  it("races within each month are sorted ascending by day", () => {
    const monthRaces = [
      mkRace({ id: "a", day: 28 }),
      mkRace({ id: "b", day: 5 }),
      mkRace({ id: "c", day: 15 }),
    ];
    const groups = getRacesByMonth({ races: monthRaces, currentDay: 1 }, {});
    const january = groups["January"] ?? [];
    const days = january.map((r) => r.day);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThanOrEqual(days[i - 1]);
    }
  });
});
