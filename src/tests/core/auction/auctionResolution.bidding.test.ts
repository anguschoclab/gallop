import { describe, it, expect, vi } from "vitest";
import { resolveAuctionSale } from "@/core/auction/auctionResolution";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import * as engine from "@/core/auction/engine";
import { AuctionSale } from "@/game/types";

describe("resolveAuctionSale - Bidding Logic", () => {
  it("resolves a competitive bidding war between AI stables", () => {
    // We will spy on calculateNpcBid
    vi.spyOn(engine, "calculateNpcBid").mockImplementation((stable, horse, currentBid) => {
      // Simulate a bidding limit per stable
      const limits = {
        "npc-1": 150000,
        "npc-2": 250000,
      };
      const limit = limits[stable.id as keyof typeof limits] || 0;

      // If the current bid is below the limit, the stable bids slightly higher (e.g., +10000)
      if (currentBid < limit) {
        return Math.min(currentBid + 10000, limit);
      }
      return null; // Stable drops out
    });

    const horse = createTestHorse({ id: "h1", name: "Champion Lot" });
    const npc1 = createTestStable({ id: "npc-1", isMajor: true, cash: 500000, name: "Stable 1" });
    const npc2 = createTestStable({ id: "npc-2", isMajor: true, cash: 500000, name: "Stable 2" });

    const sale: Partial<AuctionSale> = {
      id: "sale-1",
      name: "Elite Sale",
      day: 100,
      kind: "yearling",
      resolved: false,
      lots: [
        {
          id: "lot-1",
          horseId: "h1",
          consignorStableId: "consignor-1",
          saleId: "sale-1",
          reservePrice: 50000,
          passed: false,
          withdrawn: false,
        },
      ],
    };

    const result = resolveAuctionSale(sale as AuctionSale, [npc1, npc2], [horse]);

    expect(result.lots[0].passed).toBe(false);
    expect(result.lots[0].soldToStableId).toBe("npc-2");

    // npc-1's limit is 150000, so it will bid up to 150000.
    // npc-2 will then bid 160000 and win.
    expect(result.lots[0].hammerPrice).toBe(160000);

    expect(result.log[0]).toContain("sold to Stable 2");

    vi.restoreAllMocks();
  });
});
