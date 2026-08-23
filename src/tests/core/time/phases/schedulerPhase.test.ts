import { describe, it, expect } from "vitest";
import { schedulerPhase } from "@/core/time/phases/schedulerPhase";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("schedulerPhase", () => {
  it("should return context unchanged when no campaigns exist", () => {
    const state = makeGameState({ campaigns: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should return context unchanged when campaigns is undefined", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should skip campaigns for non-owned horses", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: { type: "unowned" } });
    const campaign = {
      id: "camp-1",
      horseId: "horse-1",
      autoManaged: true,
      slots: [],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      horses: h2r([horse]),
      campaigns: [campaign as any],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result.state.campaigns).toHaveLength(1);
  });

  it("should handle empty state gracefully", () => {
    const state = makeGameState({ campaigns: [] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);
    expect(result).toBe(context);
  });

  it("schedulerPhase does not emit cash_change for entry fees", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: { type: "player" } });
    const campaign = {
      id: "camp-1",
      horseId: "horse-1",
      autoManaged: true,
      slots: [
        {
          raceId: "race-1",
          status: "planned",
          dayTarget: 1,
        },
      ],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      day: 1,
      cash: 100000,
      horses: h2r([horse]),
      campaigns: [campaign as any],
      races: {
        "race-1": {
          id: "race-1",
          name: "Test Race",
          day: 1,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          fieldSize: 8,
          entries: [],
          resolved: false,
        },
      } as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);

    const cashChangeImpacts = result.impacts.filter((i) => i.type === "cash_change");
    expect(cashChangeImpacts).toHaveLength(0);

    const raceEntryImpacts = result.impacts.filter((i) => i.type === "race_entry");
    expect(raceEntryImpacts.length).toBeGreaterThan(0);
  });

  it("schedulerPhase does not double-enter horse already entered via intentCollection", () => {
    const horse = createTestHorse({ id: "horse-dup", ownership: { type: "player" } });
    const campaign = {
      id: "camp-dup",
      horseId: "horse-dup",
      autoManaged: true,
      slots: [
        {
          raceId: "race-dup",
          status: "planned",
          dayTarget: 1,
        },
      ],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      day: 1,
      cash: 100000,
      horses: h2r([horse]),
      campaigns: [campaign as any],
      races: {
        "race-dup": {
          id: "race-dup",
          name: "Dup Test Race",
          day: 1,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          fieldSize: 8,
          // Horse already entered — simulates intentCollection having processed first
          entries: [{ horseId: "horse-dup", ownership: { type: "player" } }],
          resolved: false,
        },
      } as any,
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = schedulerPhase.execute(context);

    const raceEntryImpacts = result.impacts.filter(
      (i) => i.type === "race_entry" && (i as any).horseId === "horse-dup",
    );
    expect(raceEntryImpacts).toHaveLength(0);
  });
});
