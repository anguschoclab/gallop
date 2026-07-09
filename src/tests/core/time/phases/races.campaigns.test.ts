/**
 * Tests for racesPhase campaign deadline notification logic.
 * Validates that bolt's O(1) hash map optimization preserves correct behavior.
 */

import { describe, it, expect } from "vitest";
import { racesPhase } from "@/core/time/phases/races";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Race, HorseCampaign } from "@/game/types";

function mkRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 17,
    distance: 2000,
    raceClass: "Stakes",
    entryFee: 500,
    purse: 10000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  } as Race;
}

function mkCampaign(
  overrides: Partial<HorseCampaign> = {},
): HorseCampaign {
  return {
    horseId: "horse-1",
    goalType: "chase_g1",
    slots: [
      {
        dayTarget: 17,
        dayWindow: 7,
        raceId: "race-1",
        role: "target",
        status: "planned",
      },
    ],
    flags: [],
    autoManaged: false,
    confirmedAptitudes: {
      surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
      distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
    },
    createdDay: 1,
    lastReviewedDay: 1,
    ...overrides,
  };
}

describe("racesPhase campaign deadline notifications", () => {
  it("emits inbox impact when targeted race is 7 days away", () => {
    const race = mkRace({ id: "race-1", name: "Big Race", day: 17 });
    const horse = createTestHorse({ id: "horse-1", name: "Thunder" });
    const campaign = mkCampaign({
      horseId: "horse-1",
      slots: [
        {
          dayTarget: 17,
          dayWindow: 7,
          raceId: "race-1",
          role: "target",
          status: "planned",
        },
      ],
    });

    const state = makeGameState({
      day: 10,
      races: [race],
      horses: [horse],
      campaigns: [campaign],
    }) as GameState;

    const context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts).toHaveLength(1);
    expect((inboxImpacts[0] as any).message.title).toContain("Big Race");
    expect((inboxImpacts[0] as any).message.body).toContain("Thunder");
  });

  it("does not emit impact when race is not 7 days away", () => {
    const race = mkRace({ id: "race-1", name: "Far Race", day: 24 });
    const horse = createTestHorse({ id: "horse-1", name: "Thunder" });
    const campaign = mkCampaign({
      horseId: "horse-1",
      slots: [
        {
          dayTarget: 24,
          dayWindow: 7,
          raceId: "race-1",
          role: "target",
          status: "planned",
        },
      ],
    });

    const state = makeGameState({
      day: 10,
      races: [race],
      horses: [horse],
      campaigns: [campaign],
    }) as GameState;

    const context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts).toHaveLength(0);
  });

  it("does not emit impact for non-planned slots", () => {
    const race = mkRace({ id: "race-1", name: "Big Race", day: 17 });
    const horse = createTestHorse({ id: "horse-1", name: "Thunder" });
    const campaign = mkCampaign({
      horseId: "horse-1",
      slots: [
        {
          dayTarget: 17,
          dayWindow: 7,
          raceId: "race-1",
          role: "target",
          status: "entered",
        },
      ],
    });

    const state = makeGameState({
      day: 10,
      races: [race],
      horses: [horse],
      campaigns: [campaign],
    }) as GameState;

    const context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts).toHaveLength(0);
  });

  it("finds race by raceId when raceKey is absent", () => {
    const race = mkRace({ id: "race-id-1", name: "ID Race", day: 17 });
    const horse = createTestHorse({ id: "horse-1", name: "Thunder" });
    const campaign = mkCampaign({
      horseId: "horse-1",
      slots: [
        {
          dayTarget: 17,
          dayWindow: 7,
          raceId: "race-id-1",
          role: "target",
          status: "planned",
        },
      ],
    });

    const state = makeGameState({
      day: 10,
      races: [race],
      horses: [horse],
      campaigns: [campaign],
    }) as GameState;

    const context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts).toHaveLength(1);
    expect((inboxImpacts[0] as any).message.title).toContain("ID Race");
  });

  it("finds race by raceKey when raceId is absent", () => {
    const race = mkRace({
      id: "race-key-1",
      name: "Key Race",
      day: 17,
      graded: {
        key: "graded-key-1",
        grade: "G1",
        track: "Test Track",
        trackId: "test-track",
        surface: "Dirt",
      },
    });
    const horse = createTestHorse({ id: "horse-1", name: "Thunder" });
    const campaign = mkCampaign({
      horseId: "horse-1",
      slots: [
        {
          dayTarget: 17,
          dayWindow: 7,
          raceKey: "graded-key-1",
          role: "target",
          status: "planned",
        },
      ],
    });

    const state = makeGameState({
      day: 10,
      races: [race],
      horses: [horse],
      campaigns: [campaign],
    }) as GameState;

    const context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts).toHaveLength(1);
    expect((inboxImpacts[0] as any).message.title).toContain("Key Race");
  });

  it("handles missing horse gracefully", () => {
    const race = mkRace({ id: "race-1", name: "Big Race", day: 17 });
    const campaign = mkCampaign({
      horseId: "missing-horse",
      slots: [
        {
          dayTarget: 17,
          dayWindow: 7,
          raceId: "race-1",
          role: "target",
          status: "planned",
        },
      ],
    });

    const state = makeGameState({
      day: 10,
      races: [race],
      horses: [],
      campaigns: [campaign],
    }) as GameState;

    const context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts).toHaveLength(1);
    expect((inboxImpacts[0] as any).message.body).toContain("Your horse");
  });

  it("handles empty campaigns array", () => {
    const state = makeGameState({
      day: 10,
      campaigns: [],
    }) as GameState;

    const context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    expect(result.impacts).toEqual([]);
  });

  it("handles undefined campaigns", () => {
    const state = makeGameState({
      day: 10,
    }) as GameState;
    state.campaigns = undefined;

    const context = makePipelineContext({
      previousDay: 9,
      newDay: 10,
      state,
    }) as PipelineContext;

    const result = racesPhase.execute(context);
    expect(result.impacts).toEqual([]);
  });
});
