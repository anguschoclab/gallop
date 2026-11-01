import { describe, expect, it } from "vitest";
import { createAuctionRunner } from "@/domains/auction/simulation/runner";
import { resolveAuctionSale } from "@/domains/auction/simulation/auctionResolution";
import type { AuctionLot, AuctionSale, Horse, Stable } from "@/platform/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

// Ten identical valuable stallions at stud, one cash-limited buyer.
const STUD = {
  atStud: true, standingFee: 50_000, bookSize: 100, seasonBookings: 0,
  lifetimeFoals: 0, lifetimeStakesFoals: 0, lifetimeG1Foals: 0, retiredOnDay: 1,
} as Horse["stud"];
const horses: Horse[] = Array.from({ length: 10 }, (_, i) =>
  createTestHorse({ id: `h${i}`, name: `Sire ${i}`, age: 8, gender: "horse", stud: STUD,
    stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80, temperament: 60, conformation: 60 } } as Partial<Horse>),
);
const lots: AuctionLot[] = horses.map((h, i) => ({
  id: `lot${i}`, horseId: h.id, consignorStableId: "seller", saleId: "sale", reservePrice: 1000, passed: false, withdrawn: false,
}));
const sale: AuctionSale = { id: "sale", name: "Test", day: 10, kind: "mixed", lots, resolved: false };
const CASH = 1_000_000;
const buyer = (): Stable => createTestStable({ id: "buyer", isMajor: true, personality: "prestige", tier: "elite", cash: CASH });

describe("a rival stable can't spend the same cash twice in one sale", () => {
  it("live auction: total spent by the buyer stays within its cash", () => {
    const runner = createAuctionRunner(sale, [buyer()], horses);
    runner.runToCompletion();
    const spent = runner.finalLots().filter((l) => l.soldToStableId === "buyer").reduce((s, l) => s + (l.hammerPrice ?? 0), 0);
    expect(spent).toBeGreaterThan(0);
    expect(spent).toBeLessThanOrEqual(CASH);
  });

  it("offline resolution: total spent by the buyer stays within its cash", () => {
    const { lots: out } = resolveAuctionSale(sale, [buyer()], horses);
    const spent = out.filter((l) => l.soldToStableId === "buyer").reduce((s, l) => s + (l.hammerPrice ?? 0), 0);
    expect(spent).toBeGreaterThan(0);
    expect(spent).toBeLessThanOrEqual(CASH);
  });
});
