/**
 * Tests for auction resolution phase
 */

import { describe, it, expect } from "vitest";
import { auctionResolutionPhase } from "@/core/time/phases/auctionResolution";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, AuctionSale, AuctionLot } from "@/game/types";
import type { AuctionBidIntent } from "@/core/resolver/intents";

describe("auctionResolutionPhase", () => {
  const createTestState = (): GameState => ({
    day: 1,
    cash: 10000,
    horses: [],
    npcStables: [],
    pregnancies: [],
    races: [],
    awards: [],
    market: [],
    auctions: [],
    lastCalibrationDay: 0,
    calibratedPars: {},
    paceSamples: {},
    pendingAwardCeremonies: [],
    trainingUsed: {},
    log: [],
    scoutReports: [],
    pendingIntents: [],
  });

  const createTestContext = (state: GameState, intents: AuctionBidIntent[] = []): PipelineContext => ({
    previousDay: 0,
    newDay: 1,
    state,
    logs: [],
    dailyRng: {} as any,
    intents,
    impacts: [],
    impactLog: [],
  });

  it("should process auction bid intent and generate auction bid impact", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const lot: AuctionLot = {
      id: "lot-1",
      horseId: "horse-1",
      saleId: "sale-1",
      reservePrice: 5000,
      passed: false,
      withdrawn: false,
    };

    const auction: AuctionSale = {
      id: "sale-1",
      name: "Test Sale",
      day: 5,
      kind: "yearling",
      lots: [lot],
      resolved: false,
    };

    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      auctions: [auction],
      cash: 10000,
    };

    const intent: AuctionBidIntent = {
      id: "intent-1",
      day: 1,
      type: "auction_bid",
      entityId: "player",
      priority: 100,
      source: "player",
      saleId: "sale-1",
      lotId: "lot-1",
      amount: 6000,
    };

    const context = createTestContext(state, [intent]);
    const result = auctionResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(1);
    expect(result.impacts[0].type).toBe("auction_bid");
  });

  it("should generate cash change impact for auction bid", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const lot: AuctionLot = {
      id: "lot-1",
      horseId: "horse-1",
      saleId: "sale-1",
      reservePrice: 5000,
      passed: false,
      withdrawn: false,
    };

    const auction: AuctionSale = {
      id: "sale-1",
      name: "Test Sale",
      day: 5,
      kind: "yearling",
      lots: [lot],
      resolved: false,
    };

    const state: GameState = {
      ...createTestState(),
      horses: [horse],
      auctions: [auction],
      cash: 10000,
    };

    const intent: AuctionBidIntent = {
      id: "intent-1",
      day: 1,
      type: "auction_bid",
      entityId: "player",
      priority: 100,
      source: "player",
      saleId: "sale-1",
      lotId: "lot-1",
      amount: 6000,
    };

    const context = createTestContext(state, [intent]);
    const result = auctionResolutionPhase.execute(context);

    const cashImpact = result.impacts.find((i) => i.type === "cash_change");
    expect(cashImpact).toBeDefined();
  });

  it("should skip non-auction bid intents", () => {
    const horse = createTestHorse({ id: "horse-1" });
    const state: GameState = {
      ...createTestState(),
      horses: [horse],
    };

    const context = createTestContext(state, [] as any);
    const result = auctionResolutionPhase.execute(context);

    expect(result.impacts).toHaveLength(0);
  });

  it("should have correct order", () => {
    expect(auctionResolutionPhase.order).toBe(55);
  });

  it("should have correct name", () => {
    expect(auctionResolutionPhase.name).toBe("auctionResolution");
  });
});
