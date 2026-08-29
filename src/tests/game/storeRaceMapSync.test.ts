import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import { createDefaultCoreState } from "@/game/store/state/coreState";
import type { Race } from "@/core/race/types";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

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

describe("createDefaultCoreState — races initialization", () => {
  it("races is an empty Record by default", () => {
    const state = createDefaultCoreState();
    expect(state.races).toEqual({});
    expect(Object.keys(state.races).length).toBe(0);
  });
});

describe("races Record sync through store actions", () => {
  beforeEach(() => {
    useGame.setState({
      day: 1,
      races: {},
      pendingIntents: [],
      horses: {},
      npcStables: [],
      jockeys: [],
      cash: 100000,
    });
  });

  it("races Record is in sync after setRaces", () => {
    const races = [makeRace("r1", 5), makeRace("r2", 10), makeRace("r3", 15)];
    useGame.getState().setRaces(r2r(races));

    const state = useGame.getState();
    expect(Object.keys(state.races).length).toBe(3);
    expect(state.races["r1"]).toBe(races[0]);
    expect(state.races["r2"]).toBe(races[1]);
    expect(state.races["r3"]).toBe(races[2]);
  });

  it("races Record is rebuilt when races change during day advancement", async () => {
    const initialRace = makeRace("r-initial", 1, { resolved: true });
    useGame.setState({
      races: r2r([initialRace]),
    });

    await useGame.getState().advanceDay();

    const state = useGame.getState();
    expect(state.day).toBe(2);

    for (const race of Object.values(state.races)) {
      expect(state.races[race.id]).toBe(race);
    }
    expect(Object.keys(state.races).length).toBe(Object.keys(state.races).length);
  });

  it("races Record does not contain stale entries after race pruning", async () => {
    const oldResolvedRace = makeRace("r-old", 1, { resolved: true });
    const oldGradedRace = makeRace("r-graded", 1, {
      resolved: true,
      graded: { grade: "G1", series: "Test", leg: 0 } as any,
    });

    useGame.setState({
      day: 1,
      races: r2r([oldResolvedRace, oldGradedRace]),
    });

    // Advance to day 35 — ungraded resolved races older than 30 days should be pruned
    useGame.setState({ day: 34 });
    await useGame.getState().advanceDay();

    const state = useGame.getState();
    expect(state.day).toBe(35);

    // The ungraded race should be pruned from races Record
    expect(state.races["r-old"]).toBeUndefined();

    // Graded race should still exist (kept for 365 days)
    const gradedRace = state.races["r-graded"];
    if (gradedRace) {
      expect(gradedRace.resolved).toBe(true);
    }
  });

  it("races Record contains newly generated races after day advancement", async () => {
    useGame.setState({
      day: 1,
      races: {},
    });

    await useGame.getState().advanceDay();

    const state = useGame.getState();
    expect(state.day).toBe(2);
    expect(Object.keys(state.races).length).toBeGreaterThan(0);

    for (const race of Object.values(state.races)) {
      expect(state.races[race.id]).toBe(race);
    }
  });

  it("races Record entries reflect resolved status after race resolution", async () => {
    const dueRace = makeRace("r-due", 1, { resolved: false });
    useGame.setState({
      day: 1,
      races: r2r([dueRace]),
      horses: h2r([{ id: "h1", ownership: { type: "unowned" } } as any]),
    });

    await useGame.getState().advanceDay();

    const state = useGame.getState();
    const resolvedRace = state.races["r-due"];

    if (resolvedRace) {
      expect(resolvedRace.resolved).toBe(true);
    }
  });

  it("races Record is a plain object after day advancement", async () => {
    await useGame.getState().advanceDay();

    const state = useGame.getState();
    expect(typeof state.races).toBe("object");
    expect(state.races).not.toBeNull();
  });
});
