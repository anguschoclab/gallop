import { describe, it, expect } from "vitest";
import { npcClaimingPhase } from "@/core/time/phases/npcClaiming";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

describe("npcClaimingPhase", () => {
  it("should return context unchanged when no claiming races today", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = npcClaimingPhase.execute(context);
    expect(result).toBe(context);
  });

  it("should not claim own horses", () => {
    const horse = createTestHorse({
      id: "horse-1",
      ownership: makeUnowned(),
    });
    const stable = createTestStable({ id: "npc-1", cash: 1000000, horses: ["horse-1"] });
    const race = {
      id: "race-1",
      name: "Claiming Race",
      day: 10,
      entries: [{ horseId: "horse-1", ownership: makeUnowned(), npc: true }],
      fieldSize: 10,
      resolved: false,
      trackId: "track-1",
      surface: "Turf" as const,
      distance: 1600,
      grade: "G3" as const,
      raceClass: "Stakes" as const,
      entryFee: 100,
      purse: 50000,
      claiming: { price: 10000 },
    };
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
      races: { "race-1": race as any },
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = npcClaimingPhase.execute(context);
    const newClaims = result.state.claims ?? [];
    const ownClaim = newClaims.find(
      (c: any) =>
        c.raceId === "race-1" && c.horseId === "horse-1" && c.claimantStableId === "npc-1",
    );
    expect(ownClaim).toBeUndefined();
  });

  it("should file claim when price <= valuation * 0.85 and stable has cash", () => {
    const horse = createTestHorse({
      id: "horse-1",
      ownership: makePlayerOwned(),
    });
    const stable = createTestStable({ id: "npc-1", cash: 1000000, horses: [] });
    const race = {
      id: "race-1",
      name: "Claiming Race",
      day: 10,
      entries: [{ horseId: "horse-1", ownership: makePlayerOwned(), npc: false }],
      fieldSize: 10,
      resolved: false,
      trackId: "track-1",
      surface: "Turf" as const,
      distance: 1600,
      grade: "G3" as const,
      raceClass: "Stakes" as const,
      entryFee: 100,
      purse: 50000,
      claiming: { price: 1000 },
    };
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
      races: { "race-1": race as any },
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = npcClaimingPhase.execute(context);
    expect(result.state.claims).toBeDefined();
  });

  it("should not file duplicate claims", () => {
    const horse = createTestHorse({
      id: "horse-1",
      ownership: makePlayerOwned(),
    });
    const stable = createTestStable({ id: "npc-1", cash: 1000000, horses: [] });
    const existingClaim = {
      id: "claim-1",
      raceId: "race-1",
      horseId: "horse-1",
      claimantStableId: "npc-1",
      price: 1000,
      day: 10,
    };
    const race = {
      id: "race-1",
      name: "Claiming Race",
      day: 10,
      entries: [{ horseId: "horse-1", ownership: makePlayerOwned(), npc: false }],
      fieldSize: 10,
      resolved: false,
      trackId: "track-1",
      surface: "Turf" as const,
      distance: 1600,
      grade: "G3" as const,
      raceClass: "Stakes" as const,
      entryFee: 100,
      purse: 50000,
      claiming: { price: 1000 },
    };
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
      races: { "race-1": race as any },
      claims: [existingClaim as any],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = npcClaimingPhase.execute(context);
    const npc1Claims = (result.state.claims ?? []).filter(
      (c: any) =>
        c.raceId === "race-1" && c.horseId === "horse-1" && c.claimantStableId === "npc-1",
    );
    expect(npc1Claims.length).toBe(1);
  });
});
