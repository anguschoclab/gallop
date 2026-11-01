import { describe, it, expect } from "vitest";
import { consignmentResolutionPhase } from "@/platform/time/phases/consignmentResolution";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/platform/game/types";
import type { PipelineContext } from "@/platform/time/pipeline";
import { makeNpcOwned, makePlayerOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";

describe("consignmentResolutionPhase", () => {
  it("should convert consignment intents to impacts", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: makePlayerOwned() });
    const auction = {
      id: "sale-1",
      day: 10,
      resolved: false,
      lots: [],
      kind: "mixed" as const,
    };
    const intent = {
      id: "intent-1",
      entityId: "horse-1",
      source: "player" as const,
      day: 1,
      priority: 50,
      type: "consignment" as const,
      horseId: "horse-1",
      saleId: "sale-1",
      reservePrice: 50000,
    };
    const state = makeGameState({
      horses: h2r([horse]),
      auctions: [auction as any],
    }) as GameState;
    const context = makePipelineContext({
      state,
      newDay: 1,
      intents: [intent as any],
    }) as PipelineContext;

    const result = consignmentResolutionPhase.execute(context);
    const consignmentImpact = result.impacts.find((i) => i.type === "consignment");
    expect(consignmentImpact).toBeDefined();
  });

  it("should skip consignment for already-resolved auctions", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: makePlayerOwned() });
    const auction = {
      id: "sale-1",
      day: 10,
      resolved: true,
      lots: [],
      kind: "mixed" as const,
    };
    const intent = {
      id: "intent-1",
      entityId: "horse-1",
      source: "player" as const,
      day: 1,
      priority: 50,
      type: "consignment" as const,
      horseId: "horse-1",
      saleId: "sale-1",
      reservePrice: 50000,
    };
    const state = makeGameState({
      horses: h2r([horse]),
      auctions: [auction as any],
    }) as GameState;
    const context = makePipelineContext({
      state,
      newDay: 1,
      intents: [intent as any],
    }) as PipelineContext;

    const result = consignmentResolutionPhase.execute(context);
    expect(result.impacts.find((i) => i.type === "consignment")).toBeUndefined();
  });

  it("should skip consignment for already-consigned horses", () => {
    const horse = createTestHorse({
      id: "horse-1",
      ownership: makePlayerOwned(),
      consignedSaleId: "other-sale",
    });
    const auction = {
      id: "sale-1",
      day: 10,
      resolved: false,
      lots: [],
      kind: "mixed" as const,
    };
    const intent = {
      id: "intent-1",
      entityId: "horse-1",
      source: "player" as const,
      day: 1,
      priority: 50,
      type: "consignment" as const,
      horseId: "horse-1",
      saleId: "sale-1",
      reservePrice: 50000,
    };
    const state = makeGameState({
      horses: h2r([horse]),
      auctions: [auction as any],
    }) as GameState;
    const context = makePipelineContext({
      state,
      newDay: 1,
      intents: [intent as any],
    }) as PipelineContext;

    const result = consignmentResolutionPhase.execute(context);
    expect(result.impacts.find((i) => i.type === "consignment")).toBeUndefined();
  });

  it("should handle withdrawal intents", () => {
    const horse = createTestHorse({
      id: "horse-1",
      ownership: makePlayerOwned(),
      consignedSaleId: "sale-1",
    });
    const auction = {
      id: "sale-1",
      day: 10,
      resolved: false,
      lots: [],
      kind: "mixed" as const,
    };
    const intent = {
      id: "intent-1",
      entityId: "horse-1",
      source: "player" as const,
      day: 1,
      priority: 50,
      type: "consignment_withdrawal" as const,
      horseId: "horse-1",
      saleId: "sale-1",
    };
    const state = makeGameState({
      horses: h2r([horse]),
      auctions: [auction as any],
    }) as GameState;
    const context = makePipelineContext({
      state,
      newDay: 1,
      intents: [intent as any],
    }) as PipelineContext;

    const result = consignmentResolutionPhase.execute(context);
    const withdrawalImpact = result.impacts.find((i) => i.type === "consignment_withdrawal");
    expect(withdrawalImpact).toBeDefined();
  });

  it("should handle empty intents gracefully", () => {
    const state = makeGameState() as GameState;
    const context = makePipelineContext({ state, newDay: 1 }) as PipelineContext;

    const result = consignmentResolutionPhase.execute(context);
    expect(result.impacts).toEqual([]);
  });

  describe("rival-stable consignments", () => {
    const npcHorse = () =>
      createTestHorse({ id: "npc-h", ownership: makeNpcOwned(asNpcStableId("rival-1")) });
    const sale = (id: string) => ({ id, day: 10, resolved: false, lots: [], kind: "mixed" as const });
    const npcIntent = (saleId: string, sourceId = "rival-1") => ({
      id: `i-${saleId}-${sourceId}`,
      entityId: "npc-h",
      source: "npc" as const,
      sourceId,
      day: 1,
      priority: 50,
      type: "consignment" as const,
      horseId: "npc-h",
      saleId,
      reservePrice: 1000,
    });
    const run = (intents: unknown[], sales = [sale("sale-1"), sale("sale-2")]) =>
      consignmentResolutionPhase
        .execute(
          makePipelineContext({
            state: makeGameState({ horses: h2r([npcHorse()]), auctions: sales as any }) as GameState,
            newDay: 1,
            intents: intents as any,
          }) as PipelineContext,
        )
        .impacts.filter((i) => i.type === "consignment") as any[];

    it("names the rival stable as consignor so sale money never goes to the player", () => {
      const [impact] = run([npcIntent("sale-1")]);
      expect(impact.consignorStableId).toBe("rival-1");
    });

    it("enters a horse into only one sale per day", () => {
      expect(run([npcIntent("sale-1"), npcIntent("sale-2")])).toHaveLength(1);
    });

    it("ignores a rival consigning a horse it does not own", () => {
      expect(run([npcIntent("sale-1", "someone-else")])).toHaveLength(0);
    });
  });
});
