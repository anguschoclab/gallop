/**
 * A horse entered the day before its race must run in it (and keep the plan
 * and jockey booked alongside the entry) — otherwise it never gets a result,
 * race record, journal outcome or Plan Effectiveness score.
 */
import { describe, it, expect } from "vitest";
import { raceEntryResolutionPhase } from "@/platform/time/phases/raceEntryResolution";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState, h2r, r2r } from "@/tests/helpers/sampleGameState";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import type { GameState } from "@/platform/game/types";
import type { AnyIntent } from "@/platform/resolver/intents";
import type { JockeyInstructions } from "@/domains/tactics/model/tacticsTypes";
import { applyImpacts } from "@/platform/resolver/resolver";

const PLAN: JockeyInstructions = {
  horseId: "horse-1",
  raceId: "race-1",
  ridingStyle: "closer",
  earlyPosition: "drop_back",
  moveTiming: "late",
  aggressiveness: 75,
};

function setup(raceDay: number) {
  const horse = createTestHorse({ id: "horse-1" });
  const state = {
    ...makeGameState({ day: 1, cash: 10000, pendingIntents: [] }),
    horses: h2r([horse]),
    races: r2r([
      {
        id: "race-1",
        name: "Test Race",
        day: raceDay,
        distance: 1600,
        raceClass: "Maiden",
        entryFee: 500,
        purse: 10000,
        fieldSize: 8,
        entries: [],
        resolved: false,
      },
    ]),
  } as GameState;
  const base = { day: 1, entityId: "horse-1", priority: 100, source: "player" as const };
  const intents = [
    { ...base, id: "i1", type: "race_entry", raceId: "race-1", horseId: "horse-1" },
    { ...base, id: "i2", type: "tactics", raceId: "race-1", horseId: "horse-1", jockeyInstructions: PLAN },
  ] as unknown as AnyIntent[];
  return createMockPipelineContext({ state, intents, newDay: 2 });
}

describe("same-day race entries", () => {
  it("adds a horse entered the day before to the race before it runs", () => {
    const out = raceEntryResolutionPhase.execute(setup(2));
    const entry = out.state.races["race-1"].entries.find((e) => e.horseId === "horse-1");
    expect(entry).toBeDefined();
    expect(entry?.jockeyInstructions?.ridingStyle).toBe("closer");
  });

  it("does not pre-add entries for races on later days", () => {
    const out = raceEntryResolutionPhase.execute(setup(9));
    expect(out.state.races["race-1"].entries).toHaveLength(0);
  });

  it("keeps the plan set alongside the entry once impacts apply, without duplicating it", () => {
    for (const day of [2, 9]) {
      const out = raceEntryResolutionPhase.execute(setup(day));
      const applied = applyImpacts({
        state: out.state,
        intents: [],
        impacts: out.impacts,
        impactLog: [],
        day: 2,
      }).state as GameState;
      const entries = applied.races["race-1"].entries.filter((e) => e.horseId === "horse-1");
      expect(entries).toHaveLength(1);
      expect(entries[0].jockeyInstructions?.ridingStyle).toBe("closer");
      // Entry fee charged exactly once.
      expect(applied.cash).toBe(10000 - 500 - 150);
    }
  });
});
