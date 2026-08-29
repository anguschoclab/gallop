import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
/**
 * Tests for MarketHandler auction_resolution — liquidation and consignedSaleId clearing
 */

import { describe, it, expect } from "vitest";
import { MarketHandler } from "@/core/resolver/handlers/MarketHandler";
import type { GameState, Horse, AuctionSale } from "@/game/types";
import type { AuctionResolutionImpact } from "@/core/resolver/impacts/miscImpacts";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

function makeSale(overrides: Partial<AuctionSale> = {}): AuctionSale {
  return {
    id: "sale-1",
    name: "Test Sale",
    day: 10,
    kind: "liquidation",
    lots: [],
    resolved: false,
    ...overrides,
  };
}

describe("MarketHandler auction_resolution", () => {
  it("should clear consignedSaleId for NPC consignments (not just player)", () => {
    const handler = new MarketHandler();
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("existing-stable")),
      consignedSaleId: "sale-1",
    });
    const sale = makeSale({
      id: "sale-1",
      lots: [
        {
          id: "lot-1",
          horseId: "horse-1",
          saleId: "sale-1",
          consignorStableId: "npc-stable-1",
          reservePrice: 5000,
          passed: false,
          withdrawn: false,
        },
      ],
    });
    const state = {
      horses: { "horse-1": horse },
      auctions: [sale],
      npcStables: [createTestStable({ id: "npc-stable-1", cash: 50000 })],
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "auctions",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "lot-1",
      hammerPrice: 10000,
      soldToStableId: "buyer-1",
      passed: false,
      reason: "Sold",
    };

    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].consignedSaleId).toBeUndefined();
  });

  it("should clear consignedSaleId for player consignments", () => {
    const handler = new MarketHandler();
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makePlayerOwned(),
      consignedSaleId: "sale-1",
    });
    const sale = makeSale({
      id: "sale-1",
      lots: [
        {
          id: "lot-1",
          horseId: "horse-1",
          saleId: "sale-1",
          consignorStableId: undefined,
          reservePrice: 5000,
          passed: false,
          withdrawn: false,
        },
      ],
    });
    const state = {
      horses: { "horse-1": horse },
      auctions: [sale],
      npcStables: [],
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "auctions",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "lot-1",
      hammerPrice: 15000,
      soldToStableId: "buyer-1",
      passed: false,
      reason: "Sold",
    };

    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].consignedSaleId).toBeUndefined();
  });

  it("should make horse unowned when passed lot is from a dissolved consignor", () => {
    const handler = new MarketHandler();
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("existing-stable")),
      consignedSaleId: "sale-1",
    });
    const sale = makeSale({
      id: "sale-1",
      lots: [
        {
          id: "lot-1",
          horseId: "horse-1",
          saleId: "sale-1",
          consignorStableId: "dissolved-stable",
          reservePrice: 5000,
          passed: false,
          withdrawn: false,
        },
      ],
    });
    // Note: "dissolved-stable" is NOT in npcStables (it was dissolved)
    const state = {
      horses: { "horse-1": horse },
      auctions: [sale],
      npcStables: [createTestStable({ id: "other-stable", cash: 50000 })],
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "auctions",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "lot-1",
      passed: true,
      reason: "Passed — no bids",
    };

    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].consignedSaleId).toBeUndefined();
    expect(draft.horses["horse-1"].ownership).toEqual({ type: "unowned" });
  });

  it("should not make horse unowned when passed lot consignor still exists", () => {
    const handler = new MarketHandler();
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("existing-stable")),
      consignedSaleId: "sale-1",
    });
    const sale = makeSale({
      id: "sale-1",
      lots: [
        {
          id: "lot-1",
          horseId: "horse-1",
          saleId: "sale-1",
          consignorStableId: "existing-stable",
          reservePrice: 5000,
          passed: false,
          withdrawn: false,
        },
      ],
    });
    const state = {
      horses: { "horse-1": horse },
      auctions: [sale],
      npcStables: [createTestStable({ id: "existing-stable", cash: 50000 })],
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "auctions",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "lot-1",
      passed: true,
      reason: "Passed — no bids",
    };

    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].consignedSaleId).toBeUndefined();
    expect(draft.horses["horse-1"].ownership.type).toBe("npc");
    expect(draft.horses["horse-1"].ownership.stableId).toBe("existing-stable");
  });

  it("should update lot fields (hammerPrice, soldToStableId, passed)", () => {
    const handler = new MarketHandler();
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 3,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("existing-stable")),
    });
    const sale = makeSale({
      id: "sale-1",
      lots: [
        {
          id: "lot-1",
          horseId: "horse-1",
          saleId: "sale-1",
          consignorStableId: "npc-stable-1",
          reservePrice: 5000,
          passed: false,
          withdrawn: false,
        },
      ],
    });
    const state = {
      horses: { "horse-1": horse },
      auctions: [sale],
      npcStables: [createTestStable({ id: "npc-stable-1", cash: 50000 })],
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "auctions",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "lot-1",
      hammerPrice: 25000,
      soldToStableId: "buyer-1",
      passed: false,
      bidHistory: [{ stableId: "buyer-1", amount: 25000, tick: 1 }],
      reason: "Sold",
    };

    handler.handle(draft, impact);

    const lot = draft.auctions[0].lots[0];
    expect(lot.hammerPrice).toBe(25000);
    expect(lot.soldToStableId).toBe("buyer-1");
    expect(lot.passed).toBe(false);
    expect(lot.bidHistory).toHaveLength(1);
  });

  it("should do nothing if sale not found", () => {
    const handler = new MarketHandler();
    const state = {
      horses: {},
      auctions: [],
      npcStables: [],
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "auctions",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "nonexistent",
      lotId: "lot-1",
      passed: true,
      reason: "No sale",
    };

    handler.handle(draft, impact);
    expect(draft.auctions).toHaveLength(0);
  });

  it("should do nothing if lot not found in sale", () => {
    const handler = new MarketHandler();
    const sale = makeSale({ id: "sale-1", lots: [] });
    const state = {
      horses: {},
      auctions: [sale],
      npcStables: [],
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "auctions",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "nonexistent-lot",
      passed: true,
      reason: "No lot",
    };

    handler.handle(draft, impact);
    expect(draft.auctions[0].lots).toHaveLength(0);
  });

  it("regression guard: non-liquidation NPC consignment also clears consignedSaleId", () => {
    const handler = new MarketHandler();
    const horse = createTestHorse({
      id: "horse-1",
      name: "Horse 1",
      age: 2,
      gender: "colt",
      ownership: makeNpcOwned(asNpcStableId("existing-stable")),
      consignedSaleId: "sale-1",
    });
    const sale = makeSale({
      id: "sale-1",
      kind: "2yo_training",
      lots: [
        {
          id: "lot-1",
          horseId: "horse-1",
          saleId: "sale-1",
          consignorStableId: "npc-stable-1",
          reservePrice: 10000,
          passed: false,
          withdrawn: false,
        },
      ],
    });
    const state = {
      horses: { "horse-1": horse },
      auctions: [sale],
      npcStables: [createTestStable({ id: "npc-stable-1", cash: 50000 })],
    } as unknown as GameState;

    const draft = JSON.parse(JSON.stringify(state));
    const impact: AuctionResolutionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "auctions",
      logLevel: "always",
      type: "auction_resolution",
      saleId: "sale-1",
      lotId: "lot-1",
      hammerPrice: 20000,
      soldToStableId: "buyer-1",
      passed: false,
      reason: "Sold",
    };

    handler.handle(draft, impact);

    // Pre-fix bug: NPC consignments never cleared consignedSaleId.
    // Post-fix: ALL lots clear consignedSaleId.
    expect(draft.horses["horse-1"].consignedSaleId).toBeUndefined();
  });
});
