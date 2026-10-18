import { describe, expect, it } from "vitest";
import { npcClaimingPhase } from "@/core/time/phases/npcClaiming";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { makePlayerOwned } from "@/core/horse/ownership";

describe("quarantined npcClaimingPhase", () => {
  it("is not registered in the authoritative pipeline", () => {
    expect(GAME_PIPELINE_PHASES).not.toContain(npcClaimingPhase);
  });

  it("does not create a second claim-writing path when invoked directly", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: makePlayerOwned() });
    const stable = createTestStable({ id: "npc-1", cash: 1_000_000, horses: [] });
    const race = {
      id: "race-1",
      name: "Claiming Race",
      day: 10,
      entries: [{ horseId: horse.id, ownership: makePlayerOwned() }],
      resolved: false,
      claimingPrice: 1000,
    };
    const state = makeGameState({
      horses: h2r([horse]),
      npcStables: [stable],
      races: { "race-1": race as any },
      claims: [],
    }) as GameState;
    const context = makePipelineContext({ state, newDay: 10 }) as PipelineContext;

    const result = npcClaimingPhase.execute(context);

    expect(result).toBe(context);
    expect(result.state.claims).toEqual([]);
  });
});
