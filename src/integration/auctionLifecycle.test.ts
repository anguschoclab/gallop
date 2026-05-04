/**
 * Integration Tests: Auction Lifecycle
 * Tests that modules work together correctly in the sale generation → lot creation → resolution → transfer flow
 */

import { describe, it, expect } from "vitest";
import { generateAuctionLots, resolveAuctionSale } from "@/game/auction";
import type { GameState, Horse, Stable } from "@/game/types";

describe("Auction Lifecycle Integration", () => {
  it("should generate auction lots", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 2,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

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
      },
    ];

    const result = generateAuctionLots(10, npcStables, [horse], "weanling", "Test Sale");
    
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
      },
    ];

    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 2,
      gender: "colt",
      hemisphere: "Northern",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      potential: 75,
      energy: 100,
      form: 0,
      silk: "blue",
      owned: false,
      fame: 50,
      stableId: "stable-1",
      raceHistory: [],
    };

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

    const result = generateAuctionLots(10, npcStables, horses, "weanling", "Test Sale");
    
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
});
