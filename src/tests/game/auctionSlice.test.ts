import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import type { AuctionSale, AuctionLot } from "@/game/types";

function mkLot(overrides: Partial<AuctionLot> = {}): AuctionLot {
  return {
    id: "lot1",
    horseId: "h1",
    consignorStableId: "s1",
    saleId: "sale1",
    reservePrice: 1000,
    passed: false,
    withdrawn: false,
    ...overrides,
  };
}

function mkSale(lots: AuctionLot[], overrides: Partial<AuctionSale> = {}): AuctionSale {
  return {
    id: "sale1",
    name: "Test Sale",
    day: 10,
    kind: "yearling",
    lots,
    resolved: false,
    ...overrides,
  };
}

function seedStore(overrides: Record<string, unknown> = {}) {
  useGame.setState({ ...createDefaultGameState(), ...overrides } as any);
}

describe("commitAuctionResult", () => {
  beforeEach(() => {
    seedStore();
  });

  it("returns ok:false for a non-existent sale ID", () => {
    seedStore({ auctions: [] });
    const result = useGame.getState().commitAuctionResult("no-such-sale", [], []);
    expect(result.ok).toBe(false);
  });

  it("sets resolved=true on the sale after commit", () => {
    const sale = mkSale([mkLot()]);
    seedStore({ auctions: [sale] });
    useGame.getState().commitAuctionResult("sale1", [], []);
    const auctions = useGame.getState().auctions ?? [];
    expect(auctions[0].resolved).toBe(true);
  });

  it("merges finalLot data into existing lots", () => {
    const lot = mkLot({ id: "lot1" });
    const sale = mkSale([lot]);
    seedStore({ auctions: [sale] });

    const finalLots: AuctionLot[] = [
      { ...lot, hammerPrice: 5000, soldToStableId: "buyer1" },
    ];
    useGame.getState().commitAuctionResult("sale1", finalLots, []);

    const auctions = useGame.getState().auctions ?? [];
    expect(auctions[0].lots[0].hammerPrice).toBe(5000);
    expect(auctions[0].lots[0].soldToStableId).toBe("buyer1");
  });

  it("leaves lots not in finalLots unchanged", () => {
    const lot1 = mkLot({ id: "lot1" });
    const lot2 = mkLot({ id: "lot2", horseId: "h2" });
    const sale = mkSale([lot1, lot2]);
    seedStore({ auctions: [sale] });

    const finalLots: AuctionLot[] = [
      { ...lot1, hammerPrice: 3000, soldToStableId: "buyer1" },
    ];
    useGame.getState().commitAuctionResult("sale1", finalLots, []);

    const auctions = useGame.getState().auctions ?? [];
    expect(auctions[0].lots[0].hammerPrice).toBe(3000);
    expect(auctions[0].lots[1].hammerPrice).toBeUndefined();
    expect(auctions[0].lots[1].soldToStableId).toBeUndefined();
  });

  it("handles empty finalLots array gracefully", () => {
    const lot = mkLot();
    const sale = mkSale([lot]);
    seedStore({ auctions: [sale] });

    useGame.getState().commitAuctionResult("sale1", [], []);
    const auctions = useGame.getState().auctions ?? [];
    expect(auctions[0].lots[0].hammerPrice).toBeUndefined();
  });

  it("handles large lot arrays efficiently", () => {
    const lots: AuctionLot[] = [];
    const finalLots: AuctionLot[] = [];
    for (let i = 0; i < 1000; i++) {
      const lot = mkLot({ id: `lot${i}`, horseId: `h${i}` });
      lots.push(lot);
      finalLots.push({ ...lot, hammerPrice: 1000 + i, soldToStableId: `buyer${i}` });
    }
    const sale = mkSale(lots);
    seedStore({ auctions: [sale] });

    const start = performance.now();
    useGame.getState().commitAuctionResult("sale1", finalLots, []);
    const elapsed = performance.now() - start;

    const auctions = useGame.getState().auctions ?? [];
    expect(auctions[0].lots[999].hammerPrice).toBe(1999);
    expect(auctions[0].lots[0].hammerPrice).toBe(1000);
    expect(elapsed).toBeLessThan(100);
  });
});
