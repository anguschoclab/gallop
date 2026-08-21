/**
 * Tests for upkeep phase
 */

import { describe, it, expect } from "vitest";
import { upkeepPhase } from "@/core/time/phases/upkeep";
import { createTestHorse, createTestStable, createUnownedHorse } from "@/tests/helpers";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Stable } from "@/game/types";
import type { CashImpact, TransactionImpact } from "@/core/resolver/impacts/financialImpacts";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("upkeepPhase", () => {
  it("should emit cash_change and transaction impacts for player upkeep", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: h2r([
        createTestHorse({
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          ownership: { type: "player" },
        }),
        createTestHorse({
          id: "horse-2",
          name: "Horse 2",
          age: 4,
          gender: "filly",
          hemisphere: "Northern",
          ownership: { type: "player" },
        }),
      ]),
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    const cashImpact = result.impacts.find(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId === "player",
    );
    const transactionImpact = result.impacts.find(
      (i): i is TransactionImpact => i.type === "transaction",
    );

    expect(cashImpact).toBeDefined();
    expect(cashImpact!.amount).toBe(-100); // 2 * 50
    expect(transactionImpact).toBeDefined();
    expect(transactionImpact!.amount).toBe(-100);
  });

  it("should not deduct for horses with stableId (NPC horses)", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: h2r([
        createTestHorse({
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          ownership: { type: "npc", stableId: asNpcStableId("npc-stable-1") },
        }),
      ]),
      npcStables: [
        createTestStable({
          id: "npc-stable-1",
          name: "NPC Stable 1",
          cash: 5000,
          personality: "breeder",
          reputation: 70,
          tier: "elite",
          owner: "Owner 1",
          founded: 1,
        }),
      ],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    expect(result.state.cash).toBe(10000); // No deduction for NPC horse
  });

  it("should emit cash_change impacts for each NPC stable", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: h2r([
        createTestHorse({
          id: "horse-1",
          name: "Horse 1",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          ownership: { type: "npc", stableId: asNpcStableId("npc-stable-1") },
        }),
        createTestHorse({
          id: "horse-2",
          name: "Horse 2",
          age: 4,
          gender: "filly",
          hemisphere: "Northern",
          ownership: { type: "npc", stableId: asNpcStableId("npc-stable-2") },
        }),
      ]),
      npcStables: [
        createTestStable({
          id: "npc-stable-1",
          name: "NPC Stable 1",
          cash: 5000,
          personality: "breeder",
          reputation: 70,
          tier: "elite",
          owner: "Owner 1",
          founded: 1,
        }),
        createTestStable({
          id: "npc-stable-2",
          name: "NPC Stable 2",
          cash: 3000,
          personality: "trader",
          reputation: 60,
          tier: "mid",
          owner: "Owner 2",
          founded: 1,
        }),
      ],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    const npcImpacts = result.impacts.filter(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId !== "player",
    );
    expect(npcImpacts).toHaveLength(2);
    expect(npcImpacts.find((i) => i.entityId === "npc-stable-1")?.amount).toBe(-50);
    expect(npcImpacts.find((i) => i.entityId === "npc-stable-2")?.amount).toBe(-50);
  });

  it("should handle zero horses correctly", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: {},
      npcStables: [
        createTestStable({
          id: "npc-stable-1",
          name: "NPC Stable 1",
          cash: 5000,
          personality: "breeder",
          reputation: 70,
          tier: "elite",
          owner: "Owner 1",
          founded: 1,
        }),
      ],
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    expect(result.state.cash).toBe(10000); // No deduction
    expect(result.state.npcStables[0].cash).toBe(5000); // No deduction
  });

  it("should NOT charge upkeep for unowned world-stock horses", () => {
    const state: GameState = makeGameState({
      day: 1,
      cash: 10000,
      horses: h2r([
        createTestHorse({
          id: "player-horse",
          name: "Player Horse",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
          ownership: { type: "player" },
        }),
        createUnownedHorse({
          id: "unowned-horse",
          name: "Unowned Horse",
          age: 3,
          gender: "colt",
          hemisphere: "Northern",
        }),
      ]),
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    const cashImpact = result.impacts.find(
      (i): i is CashImpact => i.type === "cash_change" && i.entityId === "player",
    );

    expect(cashImpact).toBeDefined();
    // Only 1 player horse → 1 * 50 = 50, not 2 * 50 = 100
    expect(cashImpact!.amount).toBe(-50);
  });

  it("should preserve other context properties", () => {
    const state: GameState = makeGameState({
      day: 1,
    }) as GameState;

    const context: PipelineContext = makePipelineContext({
      previousDay: 0,
      newDay: 1,
      state,
      logs: [{ day: 1, text: "Existing log" }],
    }) as PipelineContext;

    const result = upkeepPhase.execute(context);
    expect(result.logs).toEqual([{ day: 1, text: "Existing log" }]);
    expect(result.state.day).toBe(1);
  });
});
