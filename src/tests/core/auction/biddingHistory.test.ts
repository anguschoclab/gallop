import { describe, it, expect } from "vitest";
import {
  buildBiddingRecord,
  mergeBiddingHistory,
  biddingHistorySummary,
  playerBidsForLot,
} from "@/core/auction/biddingHistory";
import type { AuctionLot, AuctionSale } from "@/core/market/types";
import { asHorseId, asStableId, asPlayerOwnerId } from "@/core/types/branded";

const sale = {
  id: "sale1",
  name: "Crownhill Yearlings",
  kind: "yearling",
  houseId: "house-crownhill",
  day: 12,
} as unknown as Pick<AuctionSale, "id" | "name" | "kind" | "houseId" | "day">;

function lot(overrides: Partial<AuctionLot> = {}): AuctionLot {
  return {
    id: "lot1",
    horseId: asHorseId("h1"),
    saleId: "sale1",
    reservePrice: 10_000,
    passed: false,
    withdrawn: false,
    bidHistory: [
      { stableId: undefined, amount: 12_000, tick: 1 },
      { stableId: asStableId("s2"), amount: 14_000, tick: 2 },
      { stableId: asPlayerOwnerId("player"), amount: 16_000, tick: 3 },
    ],
    ...overrides,
  } as AuctionLot;
}

describe("player bidding history", () => {
  it("collects only the player's bids in tick order", () => {
    expect(playerBidsForLot(lot())).toEqual([12_000, 16_000]);
  });

  it("returns null when the player never bid", () => {
    expect(buildBiddingRecord(sale, lot({ bidHistory: [] }), "Nobody")).toBeNull();
  });

  it("marks a lot won when the player leads at the hammer", () => {
    const rec = buildBiddingRecord(sale, lot({ hammerPrice: 16_000 }), "Comet");
    expect(rec?.outcome).toBe("won");
    expect(rec?.topBid).toBe(16_000);
    expect(rec?.hammerPrice).toBe(16_000);
    expect(rec?.houseId).toBe("house-crownhill");
  });

  it("marks a lot outbid when an NPC takes it", () => {
    const rec = buildBiddingRecord(
      sale,
      lot({ hammerPrice: 20_000, soldToStableId: asStableId("s2") }),
      "Comet",
    );
    expect(rec?.outcome).toBe("outbid");
    expect(rec?.won).toBe(false);
  });

  it("marks passed lots", () => {
    const rec = buildBiddingRecord(sale, lot({ passed: true }), "Comet");
    expect(rec?.outcome).toBe("passed");
  });

  it("upserts records by lot and summarizes the record", () => {
    const open = buildBiddingRecord(sale, lot(), "Comet")!;
    const settled = buildBiddingRecord(sale, lot({ hammerPrice: 16_000 }), "Comet")!;
    const merged = mergeBiddingHistory([open], [settled]);
    expect(merged).toHaveLength(1);
    expect(merged[0].outcome).toBe("won");

    const summary = biddingHistorySummary(merged);
    expect(summary.lots).toBe(1);
    expect(summary.won).toBe(1);
    expect(summary.spend).toBe(16_000);
    expect(summary.winRate).toBe(1);
    expect(summary.averageHammer).toBe(16_000);
  });
});
