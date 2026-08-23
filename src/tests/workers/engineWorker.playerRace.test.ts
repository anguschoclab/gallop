import { describe, it, expect } from "vitest";
import type { Race } from "@/game/types";
import type { RaceEntry } from "@/core/race/types";
import { asHorseId, asNpcStableId } from "@/core/types/branded";

function makePlayerEntry(horseId: string): RaceEntry {
  return { horseId: asHorseId(horseId), ownership: { type: "player" } };
}

function makeNpcEntry(horseId: string): RaceEntry {
  return { horseId: asHorseId(horseId), ownership: { type: "npc", stableId: asNpcStableId("s1") } };
}

function makeRace(id: string, day: number, entries: RaceEntry[], resolved = false): Race {
  return {
    id,
    name: `Race ${id}`,
    day,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 1000,
    fieldSize: 8,
    entries,
    resolved,
  } as Race;
}

describe("Player race detection via ownership discriminated union", () => {
  it("RaceEntry with ownership type 'player' is detected as player entry", () => {
    const entry = makePlayerEntry("h1");
    expect(entry.ownership?.type === "player").toBe(true);
  });

  it("RaceEntry with ownership type 'npc' is NOT detected as player entry", () => {
    const entry = makeNpcEntry("h1");
    expect(entry.ownership?.type === "player").toBe(false);
  });

  it("race.entries.some(e => e.ownership?.type === 'player') finds player race", () => {
    const race = makeRace("r1", 5, [makeNpcEntry("h1"), makePlayerEntry("h2")]);
    expect(race.entries.some((e) => e.ownership?.type === "player")).toBe(true);
  });

  it("race.entries.some(e => e.ownership?.type === 'player') returns false for NPC-only race", () => {
    const race = makeRace("r1", 5, [makeNpcEntry("h1"), makeNpcEntry("h2")]);
    expect(race.entries.some((e) => e.ownership?.type === "player")).toBe(false);
  });

  it("e.owned is undefined on RaceEntry (the bug)", () => {
    const entry = makePlayerEntry("h1");
    expect((entry as unknown as Record<string, unknown>).owned).toBeUndefined();
  });

  it("find player race in a set of races by day and ownership", () => {
    const races: Race[] = [
      makeRace("r1", 5, [makeNpcEntry("h1")]),
      makeRace("r2", 5, [makeNpcEntry("h2"), makePlayerEntry("h3")]),
      makeRace("r3", 6, [makeNpcEntry("h4")]),
    ];

    const playerRace = races.find(
      (r) => !r.resolved && r.day === 5 && r.entries.some((e) => e.ownership?.type === "player"),
    );

    expect(playerRace).toBeDefined();
    expect(playerRace!.id).toBe("r2");
  });
});
