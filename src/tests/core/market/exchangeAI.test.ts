import { describe, it, expect } from "vitest";
import {
  sellerStance,
  npcBidQuote,
  npcAskPrice,
  resolveNpcExchangeTrades,
} from "@/core/market/exchangeAI";
import { createDefaultExchangeState, type ExchangeState } from "@/core/market/exchange";
import { createTestHorse } from "@/tests/helpers";
import { makeNpcOwned } from "@/core/horse/ownership";
import type { Stable, StablePersonality } from "@/core/stable/types";
import type { StableId } from "@/core/types/branded";

function makeStable(overrides: Partial<Stable> & { id: string }): Stable {
  return {
    name: overrides.name ?? `Stable ${overrides.id}`,
    name: overrides.name ?? `Stable ${overrides.id}`,
    owner: "Owner",
    tier: "mid",
    reputation: 50,
    founded: 1990,
    cash: 1_000_000,
    horses: Array.from({ length: 10 }, (_, i) => `h${i}`),
    isMajor: false,
    colors: { primary: "#fff", secondary: "#000" },
    personality: "trader" as StablePersonality,
    staff: {} as Stable["staff"],
    outposts: [],
    ...overrides,
  } as Stable;
}

describe("exchange trading AI", () => {
  it("lists more horses and asks less when cash-pressured", () => {
    const flush = makeStable({ id: "a", cash: 5_000_000 });
    const broke = makeStable({ id: "b", cash: 2_000 });
    const flushStance = sellerStance(flush);
    const brokeStance = sellerStance(broke);

    expect(brokeStance.listCount).toBeGreaterThan(flushStance.listCount);
    expect(brokeStance.markup).toBeLessThan(flushStance.markup);
    expect(brokeStance.acceptFloor).toBeLessThan(flushStance.acceptFloor);
    expect(brokeStance.intent).toBe("raising cash");
  });

  it("prestige raises the markup a stable demands", () => {
    const humble = sellerStance(makeStable({ id: "a", reputation: 20 }));
    const grand = sellerStance(makeStable({ id: "b", reputation: 95 }));
    expect(grand.markup).toBeGreaterThan(humble.markup);
    expect(npcAskPrice(grand, 100_000, "x:1")).toBeGreaterThan(
      npcAskPrice(humble, 100_000, "x:1"),
    );
  });

  it("bids higher for aggressive personalities and lower under cash pressure", () => {
    const horse = createTestHorse({ id: "h1", ownership: makeNpcOwned("s0") });
    const aggressive = makeStable({ id: "agg", personality: "aggressive" });
    const conservative = makeStable({ id: "con", personality: "conservative" });
    const squeezed = makeStable({ id: "agg2", personality: "aggressive", cash: 30_000 });

    const a = npcBidQuote(horse, aggressive, 10, 100_000).price;
    const c = npcBidQuote(horse, conservative, 10, 100_000).price;
    const s = npcBidQuote(horse, squeezed, 10, 100_000);

    expect(a).toBeGreaterThan(0);
    expect(a).toBeGreaterThan(c * 0.9);
    expect(s.price).toBeLessThan(a);
    expect(s.rationale).toMatch(/cash/i);
  });

  it("is deterministic for the same horse/stable/day", () => {
    const horse = createTestHorse({ id: "h1", ownership: makeNpcOwned("s0") });
    const stable = makeStable({ id: "s1" });
    expect(npcBidQuote(horse, stable, 5, 50_000).price).toBe(
      npcBidQuote(horse, stable, 5, 50_000).price,
    );
  });

  it("crosses NPC bids against NPC asks and settles cash both ways", () => {
    const horse = createTestHorse({ id: "h1", ownership: makeNpcOwned("seller") });
    const seller = makeStable({ id: "seller", cash: 1_000, personality: "trader" });
    const buyer = makeStable({ id: "buyer", cash: 500_000, personality: "aggressive" });

    const state: ExchangeState = {
      ...createDefaultExchangeState(),
      asks: [
        {
          id: "ask1",
          horseId: "h1",
          sellerId: "seller",
          sellerName: seller.name,
          price: 120_000,
          fairValue: 100_000,
          createdDay: 1,
          expiresDay: 20,
        },
      ],
      bids: [
        {
          id: "bid1",
          horseId: "h1",
          bidderId: "buyer",
          bidderName: buyer.name,
          price: 95_000,
          createdDay: 1,
          expiresDay: 20,
          rationale: "test",
        },
      ],
    };

    const settlement = resolveNpcExchangeTrades({
      day: 2,
      state,
      horses: [horse],
      npcStables: [seller, buyer],
      commission: (p) => Math.round(p * 0.04),
    });

    expect(settlement.trades).toHaveLength(1);
    expect(settlement.ownershipChanges[0]).toEqual({ horseId: "h1", buyerStableId: "buyer" });
    expect(settlement.cashDeltas["buyer"]).toBe(-95_000);
    expect(settlement.cashDeltas["seller"]).toBe(95_000 - 3_800);
    expect(settlement.filledAskIds).toEqual(["ask1"]);
  });

  it("never fills player orders", () => {
    const horse = createTestHorse({ id: "h1" });
    const buyer = makeStable({ id: "buyer", cash: 500_000 });
    const state: ExchangeState = {
      ...createDefaultExchangeState(),
      asks: [
        {
          id: "ask1",
          horseId: "h1",
          sellerId: "player",
          sellerName: "My Stable",
          price: 50_000,
          fairValue: 50_000,
          createdDay: 1,
          expiresDay: 20,
        },
      ],
      bids: [
        {
          id: "bid1",
          horseId: "h1",
          bidderId: "buyer",
          bidderName: buyer.name,
          price: 90_000,
          createdDay: 1,
          expiresDay: 20,
          rationale: "test",
        },
      ],
    };

    const settlement = resolveNpcExchangeTrades({
      day: 2,
      state,
      horses: [horse],
      npcStables: [buyer],
      commission: (p) => p * 0.04,
    });
    expect(settlement.trades).toHaveLength(0);
  });
});
