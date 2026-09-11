/**
 * Tests for exchange action helpers extracted from exchangeSlice.
 */

import { describe, it, expect } from "vitest";
import { applyTradeToExchange, buildSettleTradePatch } from "@/core/market/exchangeActions";
import { createDefaultExchangeState, type ExchangeTrade } from "@/core/market/exchange";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import { emptyReputation } from "@/core/reputation/reputationEvents";

describe("applyTradeToExchange", () => {
  it("removes matching asks and bids for the traded horse", () => {
    const state = createDefaultExchangeState();
    state.asks = [
      { id: "a1", horseId: "h1", sellerId: "player", price: 1000 } as never,
      { id: "a2", horseId: "h2", sellerId: "npc1", price: 2000 } as never,
    ];
    state.bids = [
      { id: "b1", horseId: "h1", bidderId: "npc1", price: 900 } as never,
      { id: "b2", horseId: "h3", bidderId: "npc2", price: 1500 } as never,
    ];
    const trade: ExchangeTrade = {
      id: "t1",
      horseId: "h1",
      horseName: "Horse 1",
      price: 950,
      commission: 50,
      buyerId: "npc1",
      buyerName: "NPC 1",
      sellerId: "player",
      sellerName: "Me",
      day: 1,
      initiatedBy: "bid",
    };
    const result = applyTradeToExchange(state, trade);
    expect(result.asks).toHaveLength(1);
    expect(result.asks[0].id).toBe("a2");
    expect(result.bids).toHaveLength(1);
    expect(result.bids[0].id).toBe("b2");
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].id).toBe("t1");
  });

  it("does not mutate the input state", () => {
    const state = createDefaultExchangeState();
    state.asks = [{ id: "a1", horseId: "h1", sellerId: "player", price: 1000 } as never];
    const trade: ExchangeTrade = {
      id: "t1",
      horseId: "h1",
      horseName: "H1",
      price: 1000,
      commission: 0,
      buyerId: "npc1",
      buyerName: "N1",
      sellerId: "player",
      sellerName: "Me",
      day: 1,
      initiatedBy: "bid",
    };
    const result = applyTradeToExchange(state, trade);
    expect(state.asks).toHaveLength(1);
    expect(result.asks).toHaveLength(0);
  });
});

describe("buildSettleTradePatch", () => {
  it("builds a patch with cash delta, horse ownership, and exchange update", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned() });
    const exchange = createDefaultExchangeState();
    const trade: ExchangeTrade = {
      id: "t1",
      horseId: "h1",
      horseName: "H1",
      price: 1000,
      commission: 50,
      buyerId: "npc1",
      buyerName: "N1",
      sellerId: "player",
      sellerName: "Me",
      day: 1,
      initiatedBy: "bid",
    };
    const patch = buildSettleTradePatch({
      horse,
      newOwnership: makeNpcOwned(asNpcStableId("npc1")),
      playerCashDelta: 950,
      currentCash: 10000,
      currentHorses: { h1: horse },
      currentNpcStables: [createTestStable({ id: "npc1", cash: 5000 })],
      currentExchange: exchange,
      trade,
      reputation: emptyReputation(),
      logEntry: { day: 1, text: "Sold H1" },
      currentLog: [],
      npcCashDeltas: [{ stableId: "npc1", delta: -1000 }],
    });
    expect(patch.cash).toBe(10950);
    expect(patch.horses.h1.ownership?.type).toBe("npc");
    expect(patch.npcStables?.[0].cash).toBe(4000);
    expect(patch.exchange.trades).toHaveLength(1);
    expect(patch.log).toHaveLength(1);
  });

  it("handles missing npcStables gracefully", () => {
    const horse = createTestHorse({ id: "h1", ownership: makePlayerOwned() });
    const exchange = createDefaultExchangeState();
    const trade: ExchangeTrade = {
      id: "t1",
      horseId: "h1",
      horseName: "H1",
      price: 1000,
      commission: 50,
      buyerId: "house",
      buyerName: "House",
      sellerId: "player",
      sellerName: "Me",
      day: 1,
      initiatedBy: "bid",
    };
    const patch = buildSettleTradePatch({
      horse,
      newOwnership: { type: "unowned" },
      playerCashDelta: 950,
      currentCash: 10000,
      currentHorses: { h1: horse },
      currentNpcStables: undefined,
      currentExchange: exchange,
      trade,
      reputation: emptyReputation(),
      logEntry: { day: 1, text: "Sold H1" },
      currentLog: [],
    });
    expect(patch.cash).toBe(10950);
    expect(patch.npcStables).toBeUndefined();
  });
});
