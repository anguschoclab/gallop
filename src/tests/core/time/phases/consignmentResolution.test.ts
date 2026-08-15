import { describe, it, expect } from "vitest";
import { consignmentResolutionPhase } from "@/core/time/phases/consignmentResolution";
import { makeGameState, makePipelineContext, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers";
import type { GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("consignmentResolutionPhase", () => {
  it("should convert consignment intents to impacts", () => {
    const horse = createTestHorse({ id: "horse-1", owned: true });
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
    const horse = createTestHorse({ id: "horse-1", owned: true });
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
      owned: true,
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
      owned: true,
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
});
