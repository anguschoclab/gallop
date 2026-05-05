import { describe, it, expect } from "vitest";
import { generateAuctioneerLine } from "@/services/auctioneerService";
import { createRng } from "@/game/rng";
import type { Horse, Stable } from "@/game/types";
import type { AuctionTickEvent } from "@/game/auctionRunner";

describe("auctioneerService", () => {
  const rng = createRng(42);

  const mockHorse: Horse = {
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

  const mockConsignor: Stable = {
    id: "stable-1",
    name: "Test Consignor",
    cash: 500000,
    personality: "breeder",
    reputation: 70,
    tier: "elite",
    owner: "Owner 1",
    founded: 1,
    horses: [],
    isMajor: true,
    colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    country: "USA",
  };

  const mockWinner: Stable = {
    id: "stable-2",
    name: "Test Winner",
    cash: 1000000,
    personality: "aggressive",
    reputation: 80,
    tier: "elite",
    owner: "Owner 2",
    founded: 1,
    horses: [],
    isMajor: true,
    colors: { primary: "#0000FF", secondary: "#FFFFFF" },
    country: "USA",
  };

  it("generates line for LOT_OPEN event", () => {
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "lot-1" };
    const ctx = { horse: mockHorse, consignor: mockConsignor };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("isHighImpact");
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("generates line for BID_RECEIVED event", () => {
    const event: AuctionTickEvent = {
      type: "BID_RECEIVED",
      lotId: "lot-1",
      stableId: "stable-2",
      amount: 5000,
    };
    const ctx = { horse: mockHorse, consignor: mockConsignor, paddleNumber: 12 };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result).toHaveProperty("text");
    expect(result.isHighImpact).toBe(false);
    expect(result.text).toContain("$");
  });

  it("generates line for BID_WAR event", () => {
    const event: AuctionTickEvent = {
      type: "BID_WAR",
      lotId: "lot-1",
      stableIds: ["stable-1", "stable-2"],
    };
    const ctx = { horse: mockHorse };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result).toHaveProperty("text");
    expect(result.isHighImpact).toBe(true);
  });

  it("generates line for GOING_ONCE event", () => {
    const event: AuctionTickEvent = { type: "GOING_ONCE", lotId: "lot-1", amount: 10000 };
    const ctx = { horse: mockHorse };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result).toHaveProperty("text");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("generates line for GOING_TWICE event", () => {
    const event: AuctionTickEvent = { type: "GOING_TWICE", lotId: "lot-1", amount: 10000 };
    const ctx = { horse: mockHorse };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result).toHaveProperty("text");
    expect(result.text.toLowerCase()).toContain("twice");
    expect(result.isHighImpact).toBe(true);
  });

  it("generates line for SOLD event", () => {
    const event: AuctionTickEvent = {
      type: "SOLD",
      lotId: "lot-1",
      amount: 15000,
      toStableId: "stable-2",
    };
    const ctx = { horse: mockHorse, winner: mockWinner };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result).toHaveProperty("text");
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.isHighImpact).toBe(true);
  });

  it("generates line for PASSED event", () => {
    const event: AuctionTickEvent = { type: "PASSED", lotId: "lot-1", reason: "no_bids" };
    const ctx = { horse: mockHorse };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result).toHaveProperty("text");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("generates line for RESERVE_NOT_MET event", () => {
    const event: AuctionTickEvent = {
      type: "RESERVE_NOT_MET",
      lotId: "lot-1",
      amount: 8000,
      reserve: 10000,
    };
    const ctx = { horse: mockHorse };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result).toHaveProperty("text");
    expect(result.text.toLowerCase()).toContain("reserve");
  });

  it("produces variety in generated lines", () => {
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "lot-1" };
    const ctx = { horse: mockHorse };

    const lines = new Set();
    for (let i = 0; i < 20; i++) {
      const result = generateAuctioneerLine(event, ctx, createRng(i));
      lines.add(result.text);
    }

    // Should generate at least some variety
    expect(lines.size).toBeGreaterThan(1);
  });

  it("uses paddle number in BID_RECEIVED context", () => {
    const event: AuctionTickEvent = {
      type: "BID_RECEIVED",
      lotId: "lot-1",
      stableId: "stable-2",
      amount: 5000,
    };
    const ctx = { horse: mockHorse, paddleNumber: 42 };
    const result = generateAuctioneerLine(event, ctx, rng);

    // Paddle number may or may not appear in the line depending on template
    // But the context should be accepted without error
    expect(result.text).toBeDefined();
  });

  it("uses breezeSeconds in context", () => {
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "lot-1" };
    const ctx = { horse: mockHorse, breezeSeconds: 10.5 };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result.text).toBeDefined();
  });

  it("uses scoutedOverall in context", () => {
    const event: AuctionTickEvent = { type: "LOT_OPEN", lotId: "lot-1" };
    const ctx = { horse: mockHorse, scoutedOverall: 80 };
    const result = generateAuctioneerLine(event, ctx, rng);

    expect(result.text).toBeDefined();
  });
});
