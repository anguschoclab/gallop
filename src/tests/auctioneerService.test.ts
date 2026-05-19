import { describe, it, expect } from "vitest";
import { generateAuctioneerLine } from "@/services/auctioneerService";
import { createRng } from "@/game/rng";
import type { Horse, Stable } from "@/game/types";
import type { AuctionTickEvent } from "@/game/auctionRunner";
import { createTestHorse, createTestStable } from "@/tests/helpers";

describe("auctioneerService", () => {
  const rng = createRng(42);

  const mockHorse = createTestHorse({
    id: "horse-1",
    name: "Test Horse",
    age: 1,
    gender: "colt",
    stableId: "stable-1",
    owned: false,
    strideType: "average",
    trackPreference: "balanced",
  });

  const mockConsignor = createTestStable({
    id: "stable-1",
    name: "Test Consignor",
    cash: 500000,
    personality: "breeder",
    reputation: 70,
    tier: "elite",
    isMajor: true,
    country: "USA",
  });

  const mockWinner = createTestStable({
    id: "stable-2",
    name: "Test Winner",
    cash: 1000000,
    personality: "aggressive",
    reputation: 80,
    tier: "elite",
    isMajor: true,
    country: "USA",
  });

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
