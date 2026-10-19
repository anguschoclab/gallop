import { describe, it, expect } from "vitest";
import { buildAdvancePlan, interruptionForDay } from "@/platform/time/advancePlan";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { makePlayerOwned, makeUnowned } from "@/domains/horse/simulation/ownership";
import type { GameState, Race } from "@/platform/game/types";

function raceOnDay(day: number, player = true, resolved = false): Race {
  return {
    id: `race-${day}`,
    name: "Test Race",
    day,
    distance: 2000,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 10000,
    minStat: 0,
    fieldSize: 8,
    entries: [{ horseId: "h1", ownership: player ? makePlayerOwned() : makeUnowned() }],
    resolved,
  };
}

function stateWithRace(race: Race): GameState {
  const state = makeGameState({ day: 1 }) as GameState;
  return { ...state, races: { [race.id]: race } };
}

describe("buildAdvancePlan", () => {
  it("throws on non-positive ranges", () => {
    const state = makeGameState({ day: 1 }) as GameState;
    expect(() => buildAdvancePlan(state, 0, false)).toThrow(RangeError);
    expect(() => buildAdvancePlan(state, -3, false)).toThrow(RangeError);
  });

  it("marks player race days within range", () => {
    const state = stateWithRace(raceOnDay(3));
    const plan = buildAdvancePlan(state, 7, false);
    expect(plan.playerRaceDays.has(3)).toBe(true);
    expect(plan.playerRaceDays.has(4)).toBe(false);
  });

  it("ignores player races when headless", () => {
    const state = stateWithRace(raceOnDay(3));
    const plan = buildAdvancePlan(state, 7, true);
    expect(plan.playerRaceDays.size).toBe(0);
  });

  it("ignores resolved races", () => {
    const state = stateWithRace(raceOnDay(3, true, true));
    const plan = buildAdvancePlan(state, 7, false);
    expect(plan.playerRaceDays.size).toBe(0);
  });

  it("marks multiple races on one day as a single race day", () => {
    const r1 = { ...raceOnDay(3), id: "r1" };
    const r2 = { ...raceOnDay(3), id: "r2" };
    const base = makeGameState({ day: 1 }) as GameState;
    const state = { ...base, races: { r1, r2 } };
    const plan = buildAdvancePlan(state, 7, false);
    expect(plan.playerRaceDays.size).toBe(1);
  });

  it("lists weekly/seasonal/yearly boundary days", () => {
    const state = makeGameState({ day: 1 }) as GameState;
    const plan = buildAdvancePlan(state, 40, false);
    expect(plan.boundaryDays).toContain(7);
    expect(plan.boundaryDays).toContain(30);
    expect(plan.boundaryDays).not.toContain(8);
  });
});

describe("interruptionForDay", () => {
  it("returns the race to interrupt on", () => {
    const state = stateWithRace(raceOnDay(3));
    const plan = buildAdvancePlan(state, 7, false);
    const hit = interruptionForDay(plan, state, 3);
    expect(hit?.raceId).toBe("race-3");
    expect(hit?.reason).toBe("player_race");
  });

  it("returns undefined for non-race days", () => {
    const state = stateWithRace(raceOnDay(3));
    const plan = buildAdvancePlan(state, 7, false);
    expect(interruptionForDay(plan, state, 4)).toBeUndefined();
  });

  it("returns undefined in headless mode", () => {
    const state = stateWithRace(raceOnDay(3));
    const plan = buildAdvancePlan(state, 7, true);
    expect(interruptionForDay(plan, state, 3)).toBeUndefined();
  });

  it("does not stop again for a race already watched live", () => {
    const base = stateWithRace(raceOnDay(3));
    const state = {
      ...base,
      pendingIntents: [
        {
          id: "res-1",
          entityId: "race-3",
          source: "system",
          day: 2,
          priority: 10,
          type: "race_resolution",
          raceId: "race-3",
          results: [{ horseId: "h1", position: 1, time: 90 }],
          liveImpactsApplied: true,
        },
      ],
    } as unknown as GameState;
    const plan = buildAdvancePlan(state, 7, false);
    expect(interruptionForDay(plan, state, 3)).toBeUndefined();
  });
});
