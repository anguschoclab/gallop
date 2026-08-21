import { describe, it, expect } from "vitest";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState } from "@/game/types";
import type { AnyIntent } from "@/core/resolver/intents";
import { createRng } from "@/core/common/rng";

function makeMinimalState(races: Record<string, any> = {}): GameState {
  return {
    day: 10,
    races,
    horses: {},
    jockeys: [],
    npcStables: [],
    hiredStaff: [],
    pendingIntents: [],
    ...({} as any),
  } as unknown as GameState;
}

function makeContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    previousDay: 10,
    newDay: 11,
    state: makeMinimalState(),
    logs: [],
    dailyRng: createRng("test-pipeline"),
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(),
    raceMap: new Map(),
    stableMap: new Map(),
    jockeyMap: new Map(),
    ...overrides,
  } as PipelineContext;
}

describe("race_resolution intent processing", () => {
  it("raceResolutionPhase skips races that are already resolved", () => {
    const race = {
      id: "r1",
      day: 11,
      resolved: true,
      cancelled: false,
      result: [{ horseId: "h1", position: 1, time: 90.0 }],
    };

    const ctx = makeContext({
      state: makeMinimalState({ r1: race }),
    });

    const result = raceResolutionPhase.execute(ctx);
    const updatedRace = (result.state as any).races["r1"];
    expect(updatedRace.resolved).toBe(true);
    // Should not have been re-simulated — result should be unchanged
    expect(updatedRace.result[0].horseId).toBe("h1");
  });

  it("raceResolutionPhase re-simulates unresolved races (current behavior)", () => {
    const race = {
      id: "r1",
      day: 11,
      resolved: false,
      cancelled: false,
      entries: [{ horseId: "h1", ownership: { type: "player" } }],
      distance: 1600,
      purse: 50000,
      trackCondition: "Fast",
    };

    const ctx = makeContext({
      state: makeMinimalState({ r1: race }),
    });

    const result = raceResolutionPhase.execute(ctx);
    const updatedRace = (result.state as any).races["r1"];
    // Currently, unresolved races get re-simulated
    expect(updatedRace.resolved).toBe(true);
  });

  it("race_resolution intent provides results that should be used instead of re-simulating", () => {
    // This test verifies the DESIRED behavior after the fix:
    // When a race_resolution intent exists for a race, the phase should
    // use the intent's results instead of re-simulating.
    const race = {
      id: "r1",
      day: 11,
      resolved: false,
      cancelled: false,
      entries: [{ horseId: "h1", ownership: { type: "player" } }],
      distance: 1600,
      purse: 50000,
      trackCondition: "Fast",
    };

    const raceResolutionIntent: AnyIntent = {
      id: "intent-1",
      type: "race_resolution",
      entityId: "r1",
      source: "system",
      day: 10,
      priority: 100,
      raceId: "r1",
      results: [
        { horseId: "h1", position: 1, time: 85.5 },
        { horseId: "h2", position: 2, time: 86.0 },
      ],
    } as any;

    const ctx = makeContext({
      state: makeMinimalState({ r1: race }),
      intents: [raceResolutionIntent],
    });

    const result = raceResolutionPhase.execute(ctx);
    const updatedRace = (result.state as any).races["r1"];

    // After the fix: the race should be resolved with the intent's results
    expect(updatedRace.resolved).toBe(true);
    expect(updatedRace.result[0].horseId).toBe("h1");
    expect(updatedRace.result[0].time).toBe(85.5);
    expect(updatedRace.result[1].horseId).toBe("h2");
    expect(updatedRace.result[1].time).toBe(86.0);
  });
});
