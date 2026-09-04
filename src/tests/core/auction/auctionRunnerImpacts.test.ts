import { describe, it, expect } from "vitest";
import { buildAuctionImpacts } from "@/core/auction/auctionRunnerImpacts";
import type { AuctionSale, Horse, AuctionLot } from "@/game/types";
import type { LotState } from "@/core/auction/auctionRunnerTypes";
import { asOwnerKey } from "@/core/types/branded";

describe("buildAuctionImpacts", () => {
  const mockSale: AuctionSale = {
    id: "sale-1",
    name: "Test Sale",
    day: 10,
    kind: "mixed",
    lots: [],
    resolved: true,
  };

  const createMockHorse = (id: string, name: string): Horse =>
    ({ id, name, fame: 0, age: 3, gender: "colt" }) as unknown as Horse;

  const createLotState = (overrides: Partial<LotState["lot"]>): LotState => ({
    lot: {
      id: "lot-1",
      horseId: asOwnerKey("horse-1"),
      saleId: "sale-1",
      reservePrice: 1000,
      passed: false,
      withdrawn: false,
      ...overrides,
    } as AuctionLot,
    currentBid: overrides.hammerPrice || 0,
    bidHistory: [],
    leadingBidder: overrides.soldToStableId,
    chant: "sold",
    silentSteps: 0,
    consecutiveBidders: [],
  });

  it("should process withdrawn lot without additional impacts", () => {
    const lotState = createLotState({ withdrawn: true });
    const horseMap = new Map([["horse-1", createMockHorse("horse-1", "Test Horse")]]);
    const impacts = buildAuctionImpacts([lotState], mockSale, horseMap, false, 10, "auctions");
    expect(impacts.length).toBe(0);
  });

  it("should generate proper impacts when player wins an NPC consignment", () => {
    const lotState = createLotState({
      consignorStableId: asOwnerKey("npc-stable"),
      soldToStableId: undefined, // Player wins when soldToStableId is undefined
      hammerPrice: 5000,
    });
    const horseMap = new Map([["horse-1", createMockHorse("horse-1", "Test Horse")]]);
    const impacts = buildAuctionImpacts([lotState], mockSale, horseMap, false, 10, "auctions");

    expect(impacts.find((i) => i.type === "auction_resolution")).toBeDefined();
    expect(impacts.find((i) => i.type === "inbox_message")).toBeDefined();

    const playerCash = impacts.find(
      (i) => i.type === "cash_change" && i.reason === "auction_purchase_player",
    );
    expect(playerCash).toBeDefined();

    const npcCash = impacts.find(
      (i) => i.type === "cash_change" && i.reason === "auction_proceeds",
    );
    expect(npcCash).toBeDefined();

    const transfer = impacts.find((i) => i.type === "horse_transfer");
    expect(transfer).toBeDefined();
    if (transfer && transfer.type === "horse_transfer") {
      expect(transfer.toStableId).toBeUndefined();
      expect(transfer.fromStableId).toBe("npc-stable");
    }
  });

  it("should generate proper impacts when NPC wins a player consignment", () => {
    const lotState = createLotState({
      consignorStableId: undefined, // Player consignment
      soldToStableId: asOwnerKey("npc-buyer"),
      hammerPrice: 10000,
    });
    const horseMap = new Map([["horse-1", createMockHorse("horse-1", "Test Horse")]]);
    const impacts = buildAuctionImpacts([lotState], mockSale, horseMap, false, 10, "auctions");

    const npcCash = impacts.find(
      (i) => i.type === "cash_change" && i.reason === "auction_purchase",
    );
    expect(npcCash).toBeDefined();

    const playerCash = impacts.find(
      (i) => i.type === "cash_change" && i.reason === "auction_proceeds_player",
    );
    expect(playerCash).toBeDefined();

    expect(impacts.find((i) => i.type === "inbox_message")).toBeDefined();

    const transfer = impacts.find((i) => i.type === "horse_transfer");
    expect(transfer).toBeDefined();
    if (transfer && transfer.type === "horse_transfer") {
      expect(transfer.fromStableId).toBeUndefined();
      expect(transfer.toStableId).toBe("npc-buyer");
    }
  });

  it("should generate a passed inbox message if a player consignment fails to meet reserve", () => {
    const lotState = createLotState({
      consignorStableId: asOwnerKey(""), // Explicitly checking `lot.consignorStableId === ""`
      passed: true,
      hammerPrice: undefined,
    });
    const horseMap = new Map([["horse-1", createMockHorse("horse-1", "Test Horse")]]);
    const impacts = buildAuctionImpacts([lotState], mockSale, horseMap, false, 10, "auctions");

    const resolution = impacts.find((i) => i.type === "auction_resolution");
    expect(resolution).toBeDefined();
    if (resolution && resolution.type === "auction_resolution") {
      expect(resolution.passed).toBe(true);
    }

    const inbox = impacts.find((i) => i.type === "inbox_message");
    expect(inbox).toBeDefined();
    if (inbox && inbox.type === "inbox_message") {
      expect(inbox.message.title).toContain("Horse Passed");
    }

    expect(impacts.some((i) => i.type === "cash_change")).toBe(false);
    expect(impacts.some((i) => i.type === "horse_transfer")).toBe(false);
  });

  it("should suppress player inbox messages when liveMode is true", () => {
    const lotState = createLotState({
      consignorStableId: asOwnerKey("npc-stable"),
      soldToStableId: undefined,
      hammerPrice: 5000,
    });
    const horseMap = new Map([["horse-1", createMockHorse("horse-1", "Test Horse")]]);
    const impacts = buildAuctionImpacts([lotState], mockSale, horseMap, true, 10, "auctions");

    expect(impacts.some((i) => i.type === "inbox_message")).toBe(false);
  });
});
