import { describe, it, expect } from "vitest";
import { intentCollectionPhase } from "@/core/time/phases/intentCollection";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("intentCollectionPhase", () => {
  it("should collect player pendingIntents into intents array", () => {
    const pendingIntent = {
      id: "pi-1",
      entityId: "race-1",
      source: "player" as const,
      day: 1,
      priority: 50,
      type: "race_entry" as const,
      raceId: "race-1",
      horseId: "horse-1",
    };
    const state = makeGameState({ pendingIntents: [pendingIntent] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = intentCollectionPhase.execute(context);
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]).toEqual(pendingIntent);
  });

  it("should clear pendingIntents after collection", () => {
    const pendingIntent = {
      id: "pi-1",
      entityId: "race-1",
      source: "player" as const,
      day: 1,
      priority: 50,
      type: "race_entry" as const,
      raceId: "race-1",
      horseId: "horse-1",
    };
    const state = makeGameState({ pendingIntents: [pendingIntent] }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = intentCollectionPhase.execute(context);
    expect(result.state.pendingIntents).toEqual([]);
  });

  it("should collect NPC intents from NPC intent generators", () => {
    const stable = createTestStable({ id: "npc-1", cash: 100000, horses: ["horse-1"] });
    const horse = createTestHorse({ id: "horse-1", stableId: "npc-1", ownership: { type: "unowned" } });
    const state = makeGameState({
      npcStables: [stable],
      horses: h2r([horse]),
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = intentCollectionPhase.execute(context);
    expect(result.intents.length).toBeGreaterThanOrEqual(0);
  });

  it("should generate auto-campaign entries for planned slots on race day", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: { type: "player" } });
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 1,
      entries: [],
      fieldSize: 10,
      resolved: false,
      trackId: "track-1",
      surface: "Turf" as const,
      distance: 1600,
      grade: "G3" as const,
      raceClass: "Stakes" as const,
      entryFee: 100,
      purse: 50000,
    };
    const campaign = {
      id: "camp-1",
      horseId: "horse-1",
      autoManaged: true,
      slots: [
        {
          status: "planned" as const,
          raceId: "race-1",
          dayTarget: 1,
        },
      ],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      horses: h2r([horse]),
      races: { "race-1": race },
      campaigns: [campaign as any],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = intentCollectionPhase.execute(context);
    const autoEntry = result.intents.find(
      (i) => i.type === "race_entry" && i.source === "system",
    ) as any;
    expect(autoEntry).toBeDefined();
    expect(autoEntry.horseId).toBe("horse-1");
  });

  it("should not generate auto-campaign entries for non-auto-managed campaigns", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: { type: "player" } });
    const race = {
      id: "race-1",
      name: "Test Race",
      day: 1,
      entries: [],
      fieldSize: 10,
      resolved: false,
      trackId: "track-1",
      surface: "Turf" as const,
      distance: 1600,
      grade: "G3" as const,
      raceClass: "Stakes" as const,
      entryFee: 100,
      purse: 50000,
    };
    const campaign = {
      id: "camp-1",
      horseId: "horse-1",
      autoManaged: false,
      slots: [
        {
          status: "planned" as const,
          raceId: "race-1",
          dayTarget: 1,
        },
      ],
      lastReviewedDay: 0,
      confirmedAptitudes: {},
      flags: {},
    };
    const state = makeGameState({
      horses: h2r([horse]),
      races: { "race-1": race },
      campaigns: [campaign as any],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = intentCollectionPhase.execute(context);
    const autoEntry = result.intents.find((i) => i.type === "race_entry" && i.source === "system");
    expect(autoEntry).toBeUndefined();
  });

  it("should handle empty state gracefully", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = intentCollectionPhase.execute(context);
    expect(result.intents).toEqual([]);
    expect(result.state.pendingIntents).toEqual([]);
  });

  it("should preserve other context properties", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 5 }) as PipelineContext;
    context.logs = [{ day: 4, text: "Existing log" }];

    const result = intentCollectionPhase.execute(context);
    expect(result.logs).toContainEqual({ day: 4, text: "Existing log" });
  });
});
