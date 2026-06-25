import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import type { Race } from "@/core/race/types";

function makeRace(id: string, day: number = 1, overrides?: Partial<Race>): Race {
  return {
    id,
    name: `Test Race ${id}`,
    day,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 10000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  } as unknown as Race;
}

describe("raceMap sync through store actions", () => {
  beforeEach(() => {
    useGame.setState({
      day: 1,
      races: [],
      raceMap: new Map(),
      pendingIntents: [],
      horses: [],
      horseMap: new Map(),
      npcStables: [],
      jockeys: [],
      cash: 100000,
    });
  });

  it("raceMap is in sync after setRaces", () => {
    const races = [makeRace("r1", 5), makeRace("r2", 10), makeRace("r3", 15)];
    useGame.getState().setRaces(races);

    const state = useGame.getState();
    expect(state.raceMap.size).toBe(3);
    expect(state.raceMap.get("r1")).toBe(races[0]);
    expect(state.raceMap.get("r2")).toBe(races[1]);
    expect(state.raceMap.get("r3")).toBe(races[2]);
  });

  it("raceMap is rebuilt when races change during day advancement", async () => {
    const initialRace = makeRace("r-initial", 1, { resolved: true });
    useGame.setState({
      races: [initialRace],
      raceMap: new Map([[initialRace.id, initialRace]]),
    });

    await useGame.getState().advanceDay();

    const state = useGame.getState();
    expect(state.day).toBe(2);
    expect(state.raceMap).toBeInstanceOf(Map);

    for (const race of state.races) {
      expect(state.raceMap.get(race.id)).toBe(race);
    }
    expect(state.raceMap.size).toBe(state.races.length);
  });

  it("raceMap does not contain stale entries after race pruning", async () => {
    const oldResolvedRace = makeRace("r-old", 1, { resolved: true });
    const oldGradedRace = makeRace("r-graded", 1, {
      resolved: true,
      graded: { grade: "G1", series: "Test", leg: 0 } as any,
    });

    useGame.setState({
      day: 1,
      races: [oldResolvedRace, oldGradedRace],
      raceMap: new Map([
        [oldResolvedRace.id, oldResolvedRace],
        [oldGradedRace.id, oldGradedRace],
      ]),
    });

    // Advance to day 35 — ungraded resolved races older than 30 days should be pruned
    useGame.setState({ day: 34 });
    await useGame.getState().advanceDay();

    const state = useGame.getState();
    expect(state.day).toBe(35);

    // The ungraded race should be pruned from both races array and raceMap
    const ungradedInArray = state.races.find((r) => r.id === "r-old");
    expect(ungradedInArray).toBeUndefined();
    expect(state.raceMap.get("r-old")).toBeUndefined();

    // Graded race should still exist (kept for 365 days)
    const gradedInArray = state.races.find((r) => r.id === "r-graded");
    if (gradedInArray) {
      expect(state.raceMap.get("r-graded")).toBe(gradedInArray);
    }
  });

  it("raceMap contains newly generated races after day advancement", async () => {
    useGame.setState({
      day: 1,
      races: [],
      raceMap: new Map(),
    });

    await useGame.getState().advanceDay();

    const state = useGame.getState();
    expect(state.day).toBe(2);
    expect(state.races.length).toBeGreaterThan(0);

    for (const race of state.races) {
      expect(state.raceMap.get(race.id)).toBe(race);
    }
  });

  it("raceMap entries reflect resolved status after race resolution", async () => {
    const dueRace = makeRace("r-due", 1, { resolved: false });
    useGame.setState({
      day: 1,
      races: [dueRace],
      raceMap: new Map([[dueRace.id, dueRace]]),
    });

    await useGame.getState().advanceDay();

    const state = useGame.getState();
    const resolvedFromMap = state.raceMap.get("r-due");
    const resolvedFromArray = state.races.find((r) => r.id === "r-due");

    if (resolvedFromArray) {
      expect(resolvedFromArray.resolved).toBe(true);
      expect(resolvedFromMap).toBe(resolvedFromArray);
      expect(resolvedFromMap?.resolved).toBe(true);
    }
  });

  it("raceMap is a Map instance after day advancement", async () => {
    await useGame.getState().advanceDay();

    const state = useGame.getState();
    expect(state.raceMap).toBeInstanceOf(Map);
  });
});
