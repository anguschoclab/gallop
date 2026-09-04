import { describe, it, expect } from "vitest";
import { resolveAuctionSale } from "@/core/auction/auctionResolution";
import type { AuctionSale } from "@/game/types";

describe("resolveAuctionSale", () => {
  it("marks a lot as passed if the horse does not exist", () => {
    const sale: AuctionSale = {
      id: "sale-1",
      name: "Test Sale",
      day: 1,
      kind: "yearling",
      resolved: false,
      lots: [
        {
          id: "lot-1",
          saleId: "sale-1",
          horseId: "missing-horse",
          reservePrice: 1000,
          consignorStableId: "consignor-1",
          passed: false,
          withdrawn: false,
        },
      ],
    };
    const result = resolveAuctionSale(sale, [], []);
    expect(result.lots[0].passed).toBe(true);
  });
});
