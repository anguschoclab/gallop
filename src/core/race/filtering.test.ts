import { describe, it, expect } from "vitest";
import { filterRacesByCriteria, separateUpcomingAndPast, sortRacesByDay } from "./filtering";
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

const g1Race = mkRace({ id: "g1", graded: { key: "test-g1", grade: "G1", track: "Ascot", trackId: "t1", surface: "Turf" } });
const g2Race = mkRace({ id: "g2", graded: { key: "test-g2", grade: "G2", track: "Newmarket", trackId: "t2", surface: "Turf" } });
const g3Race = mkRace({ id: "g3", graded: { key: "test-g3", grade: "G3", track: "Ascot", trackId: "t3", surface: "Turf" } });
const plainRace = mkRace({ id: "plain", raceClass: "Stakes" });
const tcRace = mkRace({ id: "tc", graded: { key: "ca-kings-plate", grade: "G1", track: "Woodbine", trackId: "t4", surface: "Turf" } });

describe("filterRacesByCriteria", () => {
  const races = [g1Race, g2Race, g3Race, plainRace, tcRace];

  it("grade filter: G1 only", () => {
    const result = filterRacesByCriteria(races, { grade: "G1" }, 1);
    expect(result.map(r => r.id)).toEqual(expect.arrayContaining(["g1", "tc"]));
    expect(result.every(r => r.graded?.grade === "G1")).toBe(true);
  });

  it("grade filter: G2 only", () => {
    const result = filterRacesByCriteria(races, { grade: "G2" }, 1);
    expect(result.map(r => r.id)).toEqual(["g2"]);
  });

  it("track filter: Ascot only", () => {
    const result = filterRacesByCriteria(races, { track: "Ascot" }, 1);
    expect(result.map(r => r.id)).toEqual(expect.arrayContaining(["g1", "g3"]));
    expect(result.length).toBe(2);
  });

  it("class filter: Stakes only", () => {
    const result = filterRacesByCriteria(races, { class: "Stakes" }, 1);
    expect(result.map(r => r.id)).toEqual(["plain"]);
  });

  it("tripleCrown=true passes known TC keys, blocks others", () => {
    const result = filterRacesByCriteria(races, { tripleCrown: true }, 1);
    expect(result.map(r => r.id)).toEqual(["tc"]);
  });

  it("tripleCrown=false blocks TC keys, passes others", () => {
    const result = filterRacesByCriteria(races, { tripleCrown: false }, 1);
    expect(result.map(r => r.id)).not.toContain("tc");
    expect(result.map(r => r.id)).toContain("g1");
  });

  it("tripleCrown='all' → no filter applied", () => {
    const result = filterRacesByCriteria(races, { tripleCrown: "all" }, 1);
    expect(result.length).toBe(races.length);
  });

  it("no filters → returns all races", () => {
    const result = filterRacesByCriteria(races, {}, 1);
    expect(result.length).toBe(races.length);
  });

  it("surface filter: Turf only", () => {
    const turfRace = mkRace({ id: "turf", graded: { key: "t", grade: "G1", track: "A", trackId: "1", surface: "Turf" } });
    const dirtRace = mkRace({ id: "dirt", graded: { key: "d", grade: "G1", track: "B", trackId: "2", surface: "Dirt" } });
    const result = filterRacesByCriteria([turfRace, dirtRace], { surface: "Turf" }, 1);
    expect(result.map(r => r.id)).toEqual(["turf"]);
  });

  it("surface filter: Dirt only", () => {
    const turfRace = mkRace({ id: "turf", graded: { key: "t", grade: "G1", track: "A", trackId: "1", surface: "Turf" } });
    const dirtRace = mkRace({ id: "dirt", graded: { key: "d", grade: "G1", track: "B", trackId: "2", surface: "Dirt" } });
    const result = filterRacesByCriteria([turfRace, dirtRace], { surface: "Dirt" }, 1);
    expect(result.map(r => r.id)).toEqual(["dirt"]);
  });

  it("surface filter: Synthetic only", () => {
    const synthRace = mkRace({ id: "synth", graded: { key: "s", grade: "G1", track: "C", trackId: "3", surface: "Synthetic" } });
    const turfRace = mkRace({ id: "turf", graded: { key: "t", grade: "G1", track: "A", trackId: "1", surface: "Turf" } });
    const result = filterRacesByCriteria([synthRace, turfRace], { surface: "Synthetic" }, 1);
    expect(result.map(r => r.id)).toEqual(["synth"]);
  });

  it("surface filter: non-graded races excluded when surface filter active", () => {
    const plain = mkRace({ id: "plain", raceClass: "Stakes" });
    const turfRace = mkRace({ id: "turf", graded: { key: "t", grade: "G1", track: "A", trackId: "1", surface: "Turf" } });
    const result = filterRacesByCriteria([plain, turfRace], { surface: "Turf" }, 1);
    expect(result.map(r => r.id)).toEqual(["turf"]);
  });
});

describe("separateUpcomingAndPast", () => {
  const races = [
    mkRace({ id: "past", day: 5 }),
    mkRace({ id: "today", day: 10 }),
    mkRace({ id: "future", day: 15 }),
  ];

  it("day === currentDay is upcoming", () => {
    const { upcoming, past } = separateUpcomingAndPast(races, 10);
    expect(upcoming.map(r => r.id)).toContain("today");
    expect(past.map(r => r.id)).not.toContain("today");
  });

  it("day < currentDay is past", () => {
    const { upcoming, past } = separateUpcomingAndPast(races, 10);
    expect(past.map(r => r.id)).toContain("past");
    expect(upcoming.map(r => r.id)).not.toContain("past");
  });

  it("day > currentDay is upcoming", () => {
    const { upcoming, past } = separateUpcomingAndPast(races, 10);
    expect(upcoming.map(r => r.id)).toContain("future");
  });
});

describe("sortRacesByDay", () => {
  const races = [
    mkRace({ id: "c", day: 30 }),
    mkRace({ id: "a", day: 10 }),
    mkRace({ id: "b", day: 20 }),
  ];

  it("ascending sort", () => {
    const result = sortRacesByDay(races, true);
    expect(result.map(r => r.id)).toEqual(["a", "b", "c"]);
  });

  it("descending sort", () => {
    const result = sortRacesByDay(races, false);
    expect(result.map(r => r.id)).toEqual(["c", "b", "a"]);
  });

  it("does not mutate original array", () => {
    const original = [...races];
    sortRacesByDay(races, true);
    expect(races.map(r => r.id)).toEqual(original.map(r => r.id));
  });
});
