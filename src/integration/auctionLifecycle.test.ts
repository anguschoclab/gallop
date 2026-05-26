/**
 * Integration Tests: Auction Lifecycle
 * Tests that modules work together correctly in the sale generation → lot creation → resolution → transfer flow
 */

import { describe, it, expect } from "vitest";
import {
  generateAuctionLots,
  resolveAuctionSale,
  netProceeds,
  personalityConsignmentPolicy,
} from "@/game/auction";
import { CONSIGNMENT_COMMISSION } from "@/game/constants";
import { createRng } from "@/game/rng";
import { createAuctionRunner } from "@/game/auctionRunner";
import type { GameState, Horse, Stable } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

describe("Auction Lifecycle Integration", () => {
  it("should generate auction lots", () => {
    const horse: Horse = createTestHorse({
      id: "horse-1",
      name: "Test Horse",
      age: 2,
      gender: "colt" as const,
    });

    const npcStables = [
      {
        id: "stable-1",
        name: "NPC Stable",
        cash: 5000,
        personality: "breeder" as const,
        reputation: 70,
        tier: "elite" as const,
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
        staff: {
          trainer: null,
          groom: null,
          nutritionist: null,
          farrier: null,
          veterinarian: null,
        },
        outposts: [],
      },
    ];

    const result = generateAuctionLots(
      10,
      npcStables,
      [horse],
      "weanling",
      "Test Sale",
      createRng(12345),
    );

    // Verify result structure
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("day");
    expect(result).toHaveProperty("kind");
    expect(result).toHaveProperty("lots");
    expect(Array.isArray(result.lots)).toBe(true);
  });

  it("should resolve auction sale", () => {
    const sale = {
      id: "sale-1",
      name: "Test Sale",
      day: 10,
      kind: "weanling" as const,
      lots: [
        {
          id: "lot-1",
          horseId: "horse-1",
          consignorStableId: "stable-1",
          saleId: "sale-1",
          reservePrice: 5000,
          passed: false,
          withdrawn: false,
          hammerPrice: 10000,
          buyerStableId: "stable-2",
        },
      ],
      resolved: false,
    };

    const npcStables = [
      {
        id: "stable-1",
        name: "Consignor Stable",
        cash: 5000,
        personality: "breeder" as const,
        reputation: 70,
        tier: "elite" as const,
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
        staff: {
          trainer: null,
          groom: null,
          nutritionist: null,
          farrier: null,
          veterinarian: null,
        },
        outposts: [],
      },
      {
        id: "stable-2",
        name: "Buyer Stable",
        cash: 15000,
        personality: "breeder" as const,
        reputation: 70,
        tier: "elite" as const,
        owner: "Owner 2",
        founded: 1,
        horses: [],
        isMajor: false,
        colors: { primary: "#0000FF", secondary: "#FFFFFF" },
        staff: {
          trainer: null,
          groom: null,
          nutritionist: null,
          farrier: null,
          veterinarian: null,
        },
        outposts: [],
      },
    ];

    const horse: Horse = createTestHorse({
      id: "horse-1",
      name: "Test Horse",
      age: 2,
      gender: "colt" as const,
    });

    const result = resolveAuctionSale(sale, npcStables, [horse]);

    // Verify result structure
    expect(result.lots).toBeDefined();
    expect(result.lots.length).toBe(1);
  });

  it("should handle empty lots gracefully", () => {
    const sale = {
      id: "sale-1",
      name: "Test Sale",
      day: 10,
      kind: "weanling" as const,
      lots: [],
      resolved: false,
    };

    const npcStables: Stable[] = [];
    const horses: Horse[] = [];

    const result = resolveAuctionSale(sale, npcStables, horses);

    // Should not crash with empty lots
    expect(result.lots).toEqual([]);
  });

  it("should generate sale with valid structure", () => {
    const npcStables: Stable[] = [];
    const horses: Horse[] = [];

    const result = generateAuctionLots(
      10,
      npcStables,
      horses,
      "weanling",
      "Test Sale",
      createRng(12345),
    );

    // Check that generated sale has required fields
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("day");
    expect(result).toHaveProperty("kind");
    expect(result).toHaveProperty("lots");
    expect(result.day).toBe(10);
    expect(result.name).toBe("Test Sale");
    expect(result.kind).toBe("weanling");
  });

  // New tests for NPC cash debit and commission accounting

  it("auctionRunner emits CashImpact for NPC winners (debit verification)", () => {
    const horse: Horse = createTestHorse({
      id: "horse-1",
      name: "Test Horse",
      age: 1,
      gender: "colt" as const,
    });

    const npcStables: Stable[] = [
      {
        id: "stable-1",
        name: "Consignor Stable",
        cash: 5000,
        personality: "breeder" as const,
        reputation: 70,
        tier: "elite" as const,
        owner: "Owner 1",
        founded: 1,
        horses: [],
        isMajor: true,
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
        country: "USA",
        staff: {
          trainer: null,
          groom: null,
          nutritionist: null,
          farrier: null,
          veterinarian: null,
        },
        outposts: [],
      },
      {
        id: "stable-2",
        name: "Buyer Stable",
        cash: 15000,
        personality: "aggressive" as const,
        reputation: 70,
        tier: "elite" as const,
        owner: "Owner 2",
        founded: 1,
        horses: [],
        isMajor: true,
        colors: { primary: "#0000FF", secondary: "#FFFFFF" },
        country: "USA",
        staff: {
          trainer: null,
          groom: null,
          nutritionist: null,
          farrier: null,
          veterinarian: null,
        },
        outposts: [],
      },
    ];

    const sale = {
      id: "sale-1",
      name: "Test Sale",
      day: 10,
      kind: "yearling" as const,
      lots: [
        {
          id: "lot-1",
          horseId: "horse-1",
          consignorStableId: "stable-1",
          saleId: "sale-1",
          reservePrice: 5000,
          passed: false,
          withdrawn: false,
        },
      ],
      resolved: false,
    };

    const runner = createAuctionRunner(sale, npcStables, [horse], Date.now(), { liveMode: false });
    runner.runToCompletion();

    const impacts = runner.finalImpacts({ day: 10, phase: "test" });

    // Should have a CashImpact debiting the buyer stable
    const cashImpacts = impacts.filter((i) => i.type === "cash_change");
    const buyerDebit = cashImpacts.find(
      (i) => i.type === "cash_change" && i.entityId === "stable-2" && i.amount < 0,
    );

    expect(buyerDebit).toBeDefined();
    expect(buyerDebit && buyerDebit.type === "cash_change" ? buyerDebit.amount : 0).toBeLessThan(0);
  });

  it("commission accounting: netProceeds applies 6% commission correctly", () => {
    const hammerPrice = 10000;
    const expectedCommission = hammerPrice * CONSIGNMENT_COMMISSION;
    const expectedNet = hammerPrice - expectedCommission;

    const net = netProceeds(hammerPrice);

    expect(net).toBe(Math.round(expectedNet));
    expect(hammerPrice - net).toBe(Math.round(expectedCommission));
  });

  it("all 8 sale kinds generate correctly", () => {
    const saleKinds: Array<
      | "weanling"
      | "yearling"
      | "2yo_training"
      | "mixed"
      | "racing_age"
      | "broodmare"
      | "weanling_south"
      | "yearling_south"
    > = [
      "weanling",
      "yearling",
      "2yo_training",
      "mixed",
      "racing_age",
      "broodmare",
      "weanling_south",
      "yearling_south",
    ];

    for (const kind of saleKinds) {
      const result = generateAuctionLots(10, [], [], kind, `Test ${kind}`, createRng(Date.now()));
      expect(result.kind).toBe(kind);
      expect(result.lots).toBeDefined();
    }
  });

  it("all 8 personalities have consignment policies", () => {
    const personalities: Stable["personality"][] = [
      "aggressive",
      "conservative",
      "developer",
      "win-now",
      "specialist",
      "breeder",
      "trader",
      "prestige",
    ];

    const horse: Horse = createTestHorse({
      id: "horse-1",
      name: "Test Horse",
      age: 1,
      gender: "colt" as const,
    });

    const stable: Stable = {
      id: "stable-1",
      name: "Test Stable",
      cash: 500000,
      personality: "aggressive",
      reputation: 75,
      tier: "mid",
      owner: "Owner",
      founded: 1,
      horses: [],
      isMajor: true,
      colors: { primary: "#000", secondary: "#fff" },
      country: "USA",
      staff: {
        trainer: null,
        groom: null,
        nutritionist: null,
        farrier: null,
        veterinarian: null,
      },
      outposts: [],
    };

    for (const personality of personalities) {
      stable.personality = personality;
      const policy = personalityConsignmentPolicy(stable, "yearling", [horse], createRng(12345));
      expect(policy).toBeDefined();
      // Policy should be an object with consign, freshCount, reserveMultiplier
      expect(policy).toHaveProperty("consign");
      expect(policy).toHaveProperty("freshCount");
      expect(policy).toHaveProperty("reserveMultiplier");
    }
  });
});
