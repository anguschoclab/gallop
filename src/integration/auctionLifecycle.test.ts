/**
 * Integration Tests: Auction Lifecycle
 * Tests that modules work together correctly in the sale generation → lot creation → resolution → transfer flow
 */

import { describe, it, expect } from "vitest";
import {
  generateAuctionLots,
  resolveAuctionSale,
  netProceeds,
  CONSIGNMENT_COMMISSION,
  personalityConsignmentPolicy,
} from "@/game/auction";
import { createRng } from "@/game/rng";
import { createAuctionRunner } from "@/game/auctionRunner";
import type { GameState, Horse, Stable } from "@/game/types";

describe("Auction Lifecycle Integration", () => {
  it("should generate auction lots", () => {
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 2,
      gender: "colt",
      hemisphere: "Northern",
      silk: "blue",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      genotype: {
        color: { extension: [1, 1], agouti: [1, 1], gray: [1, 1], cream: [1, 1] },
        stats: {
          speed: [
            [1, 1],
            [1, 1],
          ],
          stamina: [
            [1, 1],
            [1, 1],
          ],
          acceleration: [
            [1, 1],
            [1, 1],
          ],
          consistency: [
            [1, 1],
            [1, 1],
          ],
        },
        preferences: { distance: [1, 1], surface: [1, 1], climbing: [1, 1], cornering: [1, 1] },
        style: [1, 1],
        mental: [1, 1],
        physical: [1, 1],
        durability: [1, 1],
        size: [1, 1],
        markers: {
          leopardComplex: "recessive",
          csnbRisk: "low",
          sensoryPerception: "good",
          signalTransduction: "good",
          immunity: "good",
          geneticDiversity: 0.8,
          lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
        },
        heart: [
          [1, 1],
          [1, 1],
        ],
        fiberType: [1, 1],
        stride: [1, 1],
        trackBias: [1, 1],
        mudAptitude: [1, 1],
        trainability: [1, 1],
        peakAge: [1, 1],
        recovery: [1, 1],
        fertility: [1, 1],
        foalingEase: [1, 1],
        markings: {
          socks: [1, 1],
          face: [1, 1],
          silverDapple: [1, 1],
          sabino: [1, 1],
          splashWhite: [1, 1],
        },
        health: { bleeder: [1, 1], roarer: [1, 1], ocd: [1, 1], efna5: [1, 1] },
      },
      energy: 100,
      form: 0,
      potential: 75,
      raceHistory: [],
      owned: false,
      fame: 50,
      stableId: "stable-1",
      distanceAptitude: 1600,
      surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
      climbingAptitude: 1.0,
      corneringAptitude: 1.0,
      injuryProneness: 0.05,
      height: 16.0,
      weight: 500,
      lifetimeEarnings: 0,
      careerStarts: 0,
      careerWins: 0,
      heartScore: 1.0,
      fiberBias: "balanced",
      strideType: "balanced",
      trackPreference: "balanced",
      mudAptitude: 1.0,
      trainability: 1.0,
      peakAge: 4,
      recoveryRate: 1.0,
      fertility: 1.0,
      foalingEase: 1.0,
      markings: {
        socks: "none",
        face: "none",
        silverDapple: false,
        sabino: false,
        splashWhite: false,
      },
      bleederRisk: 0.05,
      roarerRisk: 0.05,
      ocdRisk: 0.05,
      racingViable: true,
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
      silk: "blue",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      genotype: {
        color: { extension: [1, 1], agouti: [1, 1], gray: [1, 1], cream: [1, 1] },
        stats: {
          speed: [
            [1, 1],
            [1, 1],
          ],
          stamina: [
            [1, 1],
            [1, 1],
          ],
          acceleration: [
            [1, 1],
            [1, 1],
          ],
          consistency: [
            [1, 1],
            [1, 1],
          ],
        },
        preferences: { distance: [1, 1], surface: [1, 1], climbing: [1, 1], cornering: [1, 1] },
        style: [1, 1],
        mental: [1, 1],
        physical: [1, 1],
        durability: [1, 1],
        size: [1, 1],
        markers: {
          leopardComplex: "recessive",
          csnbRisk: "low",
          sensoryPerception: "good",
          signalTransduction: "good",
          immunity: "good",
          geneticDiversity: 0.8,
          lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
        },
        heart: [
          [1, 1],
          [1, 1],
        ],
        fiberType: [1, 1],
        stride: [1, 1],
        trackBias: [1, 1],
        mudAptitude: [1, 1],
        trainability: [1, 1],
        peakAge: [1, 1],
        recovery: [1, 1],
        fertility: [1, 1],
        foalingEase: [1, 1],
        markings: {
          socks: [1, 1],
          face: [1, 1],
          silverDapple: [1, 1],
          sabino: [1, 1],
          splashWhite: [1, 1],
        },
        health: { bleeder: [1, 1], roarer: [1, 1], ocd: [1, 1], efna5: [1, 1] },
      },
      energy: 100,
      form: 0,
      potential: 75,
      raceHistory: [],
      owned: false,
      fame: 50,
      stableId: "stable-1",
      distanceAptitude: 1600,
      surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
      climbingAptitude: 1.0,
      corneringAptitude: 1.0,
      injuryProneness: 0.05,
      height: 16.0,
      weight: 500,
      lifetimeEarnings: 0,
      careerStarts: 0,
      careerWins: 0,
      heartScore: 1.0,
      fiberBias: "balanced",
      strideType: "balanced",
      trackPreference: "balanced",
      mudAptitude: 1.0,
      trainability: 1.0,
      peakAge: 4,
      recoveryRate: 1.0,
      fertility: 1.0,
      foalingEase: 1.0,
      markings: {
        socks: "none",
        face: "none",
        silverDapple: false,
        sabino: false,
        splashWhite: false,
      },
      bleederRisk: 0.05,
      roarerRisk: 0.05,
      ocdRisk: 0.05,
      racingViable: true,
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
    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 1,
      gender: "colt",
      hemisphere: "Northern",
      silk: "blue",
      stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
      genotype: {
        color: { extension: [1, 1], agouti: [1, 1], gray: [1, 1], cream: [1, 1] },
        stats: {
          speed: [
            [1, 1],
            [1, 1],
          ],
          stamina: [
            [1, 1],
            [1, 1],
          ],
          acceleration: [
            [1, 1],
            [1, 1],
          ],
          consistency: [
            [1, 1],
            [1, 1],
          ],
        },
        preferences: { distance: [1, 1], surface: [1, 1], climbing: [1, 1], cornering: [1, 1] },
        style: [1, 1],
        mental: [1, 1],
        physical: [1, 1],
        durability: [1, 1],
        size: [1, 1],
        markers: {
          leopardComplex: "recessive",
          csnbRisk: "low",
          sensoryPerception: "good",
          signalTransduction: "good",
          immunity: "good",
          geneticDiversity: 0.8,
          lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
        },
        heart: [
          [1, 1],
          [1, 1],
        ],
        fiberType: [1, 1],
        stride: [1, 1],
        trackBias: [1, 1],
        mudAptitude: [1, 1],
        trainability: [1, 1],
        peakAge: [1, 1],
        recovery: [1, 1],
        fertility: [1, 1],
        foalingEase: [1, 1],
        markings: {
          socks: [1, 1],
          face: [1, 1],
          silverDapple: [1, 1],
          sabino: [1, 1],
          splashWhite: [1, 1],
        },
        health: { bleeder: [1, 1], roarer: [1, 1], ocd: [1, 1], efna5: [1, 1] },
      },
      energy: 100,
      form: 0,
      potential: 75,
      raceHistory: [],
      owned: false,
      fame: 50,
      stableId: "stable-1",
      distanceAptitude: 1600,
      surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
      climbingAptitude: 1.0,
      corneringAptitude: 1.0,
      injuryProneness: 0.05,
      height: 16.0,
      weight: 500,
      lifetimeEarnings: 0,
      careerStarts: 0,
      careerWins: 0,
      heartScore: 1.0,
      fiberBias: "balanced",
      strideType: "balanced",
      trackPreference: "balanced",
      mudAptitude: 1.0,
      trainability: 1.0,
      peakAge: 4,
      recoveryRate: 1.0,
      fertility: 1.0,
      foalingEase: 1.0,
      markings: {
        socks: "none",
        face: "none",
        silverDapple: false,
        sabino: false,
        splashWhite: false,
      },
      bleederRisk: 0.05,
      roarerRisk: 0.05,
      ocdRisk: 0.05,
      racingViable: true,
    };

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

    const horse: Horse = {
      id: "horse-1",
      name: "Test Horse",
      age: 1,
      gender: "colt",
      hemisphere: "Northern",
      silk: "blue",
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      genotype: {
        color: { extension: [1, 1], agouti: [1, 1], gray: [1, 1], cream: [1, 1] },
        stats: {
          speed: [
            [1, 1],
            [1, 1],
          ],
          stamina: [
            [1, 1],
            [1, 1],
          ],
          acceleration: [
            [1, 1],
            [1, 1],
          ],
          consistency: [
            [1, 1],
            [1, 1],
          ],
        },
        preferences: { distance: [1, 1], surface: [1, 1], climbing: [1, 1], cornering: [1, 1] },
        style: [1, 1],
        mental: [1, 1],
        physical: [1, 1],
        durability: [1, 1],
        size: [1, 1],
        markers: {
          leopardComplex: "recessive",
          csnbRisk: "low",
          sensoryPerception: "good",
          signalTransduction: "good",
          immunity: "good",
          geneticDiversity: 0.8,
          lethalCarriers: { csnb: false, hypp: false, olws: false, ffs1: false },
        },
        heart: [
          [1, 1],
          [1, 1],
        ],
        fiberType: [1, 1],
        stride: [1, 1],
        trackBias: [1, 1],
        mudAptitude: [1, 1],
        trainability: [1, 1],
        peakAge: [1, 1],
        recovery: [1, 1],
        fertility: [1, 1],
        foalingEase: [1, 1],
        markings: {
          socks: [1, 1],
          face: [1, 1],
          silverDapple: [1, 1],
          sabino: [1, 1],
          splashWhite: [1, 1],
        },
        health: { bleeder: [1, 1], roarer: [1, 1], ocd: [1, 1], efna5: [1, 1] },
      },
      energy: 100,
      form: 0,
      potential: 75,
      raceHistory: [],
      owned: false,
      fame: 50,
      stableId: "stable-1",
      distanceAptitude: 1600,
      surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
      climbingAptitude: 1.0,
      corneringAptitude: 1.0,
      injuryProneness: 0.05,
      height: 16.0,
      weight: 500,
      lifetimeEarnings: 0,
      careerStarts: 0,
      careerWins: 0,
      heartScore: 1.0,
      fiberBias: "balanced",
      strideType: "balanced",
      trackPreference: "balanced",
      mudAptitude: 1.0,
      trainability: 1.0,
      peakAge: 4,
      recoveryRate: 1.0,
      fertility: 1.0,
      foalingEase: 1.0,
      markings: {
        socks: "none",
        face: "none",
        silverDapple: false,
        sabino: false,
        splashWhite: false,
      },
      bleederRisk: 0.05,
      roarerRisk: 0.05,
      ocdRisk: 0.05,
      racingViable: true,
    };

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
