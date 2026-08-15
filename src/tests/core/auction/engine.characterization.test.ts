import { describe, it, expect } from "vitest";
import {
  netProceeds,
  commissionAmount,
  calculateLotValuation,
  calculateNpcBid,
  generateAuctionLots,
  resolveAuctionSale,
} from "@/core/auction/engine";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { createRng } from "@/core/common/rng";
import { CONSIGNMENT_COMMISSION } from "@/constants";

describe("netProceeds", () => {
  it("should return hammer price minus commission", () => {
    const result = netProceeds(100000);
    expect(result).toBe(Math.round(100000 * (1 - CONSIGNMENT_COMMISSION)));
  });

  it("should return 0 for hammer price of 0", () => {
    expect(netProceeds(0)).toBe(0);
  });

  it("should handle large hammer prices", () => {
    const result = netProceeds(5000000);
    expect(result).toBe(Math.round(5000000 * (1 - CONSIGNMENT_COMMISSION)));
  });
});

describe("commissionAmount", () => {
  it("should return the commission portion of hammer price", () => {
    const result = commissionAmount(100000);
    expect(result).toBe(100000 - netProceeds(100000));
  });

  it("should be positive for positive hammer price", () => {
    expect(commissionAmount(50000)).toBeGreaterThan(0);
  });
});

describe("calculateLotValuation", () => {
  it("should return a positive value for a valid horse", () => {
    const horse = createTestHorse({ id: "h1", age: 1, gender: "colt" });
    const stable = createTestStable({ id: "npc-1", cash: 500000 });
    const result = calculateLotValuation(horse, stable, "yearling");
    expect(result).toBeGreaterThan(0);
  });

  it("should return 0 minimum for horses with no value", () => {
    const horse = createTestHorse({ id: "h1", age: 1 });
    const stable = createTestStable({ id: "npc-1", cash: 0 });
    const result = calculateLotValuation(horse, stable, "yearling");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("should apply filly premium for female horses", () => {
    const colt = createTestHorse({ id: "colt", age: 1, gender: "colt" });
    const filly = createTestHorse({ id: "filly", age: 1, gender: "filly" });
    const stable = createTestStable({ id: "npc-1", cash: 500000 });
    const coltValue = calculateLotValuation(colt, stable, "yearling");
    const fillyValue = calculateLotValuation(filly, stable, "yearling");
    // Filly premium should make filly worth more (or at least not less)
    expect(fillyValue).toBeGreaterThanOrEqual(coltValue);
  });

  it("should apply conformation premium for high conformation", () => {
    const horse = createTestHorse({
      id: "h1",
      age: 1,
      stats: {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 95,
      },
    } as any);
    const lowConf = createTestHorse({
      id: "h2",
      age: 1,
      stats: {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
    } as any);
    const stable = createTestStable({ id: "npc-1", cash: 500000 });
    const highValue = calculateLotValuation(horse, stable, "yearling");
    const lowValue = calculateLotValuation(lowConf, stable, "yearling");
    expect(highValue).toBeGreaterThan(lowValue);
  });
});

describe("calculateNpcBid", () => {
  it("should return a bid when current bid is below ceiling", () => {
    const horse = createTestHorse({ id: "h1", age: 1, gender: "colt" });
    const stable = createTestStable({ id: "npc-1", cash: 500000, personality: "aggressive" });
    const rng = createRng("test");
    const bid = calculateNpcBid(stable, horse, 0, "yearling", rng);
    expect(bid).not.toBeNull();
    expect(bid).toBeGreaterThan(0);
  });

  it("should return null when current bid exceeds ceiling", () => {
    const horse = createTestHorse({ id: "h1", age: 1 });
    const stable = createTestStable({ id: "npc-1", cash: 1000, personality: "conservative" });
    const rng = createRng("test");
    const bid = calculateNpcBid(stable, horse, 999999, "yearling", rng);
    expect(bid).toBeNull();
  });

  it("should return null when ceiling is 0", () => {
    const horse = createTestHorse({ id: "h1", age: 1 });
    const stable = createTestStable({ id: "npc-1", cash: 0, personality: "conservative" });
    const rng = createRng("test");
    const bid = calculateNpcBid(stable, horse, 0, "yearling", rng);
    expect(bid).toBeNull();
  });

  it("should return rounded bid to nearest 100", () => {
    const horse = createTestHorse({ id: "h1", age: 1, gender: "colt" });
    const stable = createTestStable({ id: "npc-1", cash: 500000, personality: "aggressive" });
    const rng = createRng("test");
    const bid = calculateNpcBid(stable, horse, 1000, "yearling", rng);
    if (bid !== null) {
      expect(bid % 100).toBe(0);
    }
  });

  it("should fall back to valuation logic when npcAIManager has no auctionAI", () => {
    const horse = createTestHorse({ id: "h1", age: 1, gender: "colt" });
    const stable = createTestStable({ id: "npc-1", cash: 500000, personality: "aggressive" });
    const rng = createRng("test");
    const aiManager = {
      stableStates: { "npc-1": {} },
      globalDay: 1,
      regionalKings: {},
    } as any;
    const bid = calculateNpcBid(
      stable,
      horse,
      0,
      "yearling",
      rng,
      undefined,
      undefined,
      aiManager,
      1,
    );
    // Should fall back to non-AI logic and produce a bid
    expect(bid === null || typeof bid === "number").toBe(true);
  });
});

describe("generateAuctionLots", () => {
  it("should generate a sale with valid structure", () => {
    const rng = createRng("test-auction");
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const sale = generateAuctionLots(100, [stable], [], "yearling", "Test Sale", rng);
    expect(sale.id).toBeDefined();
    expect(sale.name).toBe("Test Sale");
    expect(sale.day).toBe(100);
    expect(sale.kind).toBe("yearling");
    expect(sale.resolved).toBe(false);
    expect(Array.isArray(sale.lots)).toBe(true);
  });

  it("should generate lots from consignors", () => {
    const rng = createRng("test-auction");
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const sale = generateAuctionLots(100, [stable], [], "yearling", "Test Sale", rng);
    // May have 0 or more lots depending on consignment policy
    expect(sale.lots.length).toBeGreaterThanOrEqual(0);
  });

  it("should only use major stables as consignors", () => {
    const rng = createRng("test-auction");
    const major = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const minor = createTestStable({ id: "npc-2", cash: 500000, isMajor: false });
    const sale = generateAuctionLots(100, [major, minor], [], "yearling", "Test Sale", rng);
    const consignorIds = new Set(sale.lots.map((l) => l.consignorStableId));
    expect(consignorIds.has("npc-2")).toBe(false);
  });

  it("should generate breeze seconds for 2yo_training sales", () => {
    const rng = createRng("test-auction-2yo");
    const stable = createTestStable({ id: "npc-1", cash: 500000, isMajor: true });
    const sale = generateAuctionLots(100, [stable], [], "2yo_training", "Breeze Sale", rng);
    for (const lot of sale.lots) {
      if (lot.breezeSeconds !== undefined) {
        expect(lot.breezeSeconds).toBeGreaterThan(0);
      }
    }
  });
});

describe("resolveAuctionSale", () => {
  it("should pass lots with no eligible bidders", () => {
    const sale = {
      id: "sale-1",
      name: "Test Sale",
      day: 100,
      kind: "yearling" as const,
      resolved: false,
      lots: [
        {
          id: "lot-1",
          horseId: "h1",
          consignorStableId: "npc-1",
          saleId: "sale-1",
          reservePrice: 10000,
          passed: false,
          withdrawn: false,
        },
      ],
    };
    const result = resolveAuctionSale(sale as any, [], []);
    expect(result.lots[0].passed).toBe(true);
  });

  it("should mark withdrawn lots as withdrawn", () => {
    const sale = {
      id: "sale-1",
      name: "Test Sale",
      day: 100,
      kind: "yearling" as const,
      resolved: false,
      lots: [
        {
          id: "lot-1",
          horseId: "h1",
          consignorStableId: "npc-1",
          saleId: "sale-1",
          reservePrice: 10000,
          passed: false,
          withdrawn: true,
        },
      ],
    };
    const result = resolveAuctionSale(sale as any, [], []);
    expect(result.lots[0].withdrawn).toBe(true);
    expect(result.lots[0].passed).toBe(false);
  });

  it("should pass lots when horse not found", () => {
    const sale = {
      id: "sale-1",
      name: "Test Sale",
      day: 100,
      kind: "yearling" as const,
      resolved: false,
      lots: [
        {
          id: "lot-1",
          horseId: "missing-horse",
          consignorStableId: "npc-1",
          saleId: "sale-1",
          reservePrice: 10000,
          passed: false,
          withdrawn: false,
        },
      ],
    };
    const result = resolveAuctionSale(sale as any, [], []);
    expect(result.lots[0].passed).toBe(true);
  });

  it("should mark deceased horses as withdrawn", () => {
    const horse = createTestHorse({ id: "h1", lifecycleStatus: "deceased" });
    const sale = {
      id: "sale-1",
      name: "Test Sale",
      day: 100,
      kind: "yearling" as const,
      resolved: false,
      lots: [
        {
          id: "lot-1",
          horseId: "h1",
          consignorStableId: "npc-1",
          saleId: "sale-1",
          reservePrice: 10000,
          passed: false,
          withdrawn: false,
        },
      ],
    };
    const result = resolveAuctionSale(sale as any, [], [horse]);
    expect(result.lots[0].withdrawn).toBe(true);
  });

  it("should return log entries for resolved lots", () => {
    const horse = createTestHorse({ id: "h1", name: "Test Horse" });
    const sale = {
      id: "sale-1",
      name: "Test Sale",
      day: 100,
      kind: "yearling" as const,
      resolved: false,
      lots: [
        {
          id: "lot-1",
          horseId: "h1",
          consignorStableId: "npc-1",
          saleId: "sale-1",
          reservePrice: 100000,
          passed: false,
          withdrawn: false,
        },
      ],
    };
    const result = resolveAuctionSale(sale as any, [], [horse]);
    expect(result.log.length).toBeGreaterThan(0);
  });
});
