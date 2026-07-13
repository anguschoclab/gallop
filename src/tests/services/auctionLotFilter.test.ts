import { describe, it, expect } from "vitest";
import { filterAndSortLots } from "@/services/auction/auctionLotFilter";
import { createTestHorse } from "@/tests/helpers";
import type { AuctionLot, Horse } from "@/game/types";

function mkLot(
  id: string,
  horseId: string,
  reservePrice: number,
  overrides?: Partial<AuctionLot>,
): AuctionLot {
  return {
    id,
    horseId,
    saleId: "sale-1",
    reservePrice,
    passed: false,
    withdrawn: false,
    ...overrides,
  };
}

function mkHorse(id: string, overrides?: Partial<Horse>): Horse {
  return createTestHorse({ id, name: `Horse ${id}`, sireName: `Sire ${id}`, ...overrides });
}

const horses: Horse[] = [
  mkHorse("h1", { gender: "colt", age: 0, name: "Alpha", sireName: "Pioneer" }),
  mkHorse("h2", { gender: "filly", age: 1, name: "Beta", sireName: "Legend" }),
  mkHorse("h3", { gender: "gelding", age: 2, name: "Gamma", sireName: "Champion" }),
  mkHorse("h4", { gender: "mare", age: 5, name: "Delta", sireName: "Pioneer" }),
  mkHorse("h5", { gender: "colt", age: 3, name: "Epsilon", sireName: "Warrior" }),
  mkHorse("h6", { gender: "filly", age: 0, name: "Zeta", sireName: "Legend" }),
  mkHorse("h7", { gender: "gelding", age: 1, name: "Eta", sireName: "Nova" }),
  mkHorse("h8", {
    gender: "mare",
    age: 10,
    name: "Theta",
    sireName: undefined as unknown as string,
  }),
];

const lots: AuctionLot[] = [
  mkLot("l1", "h1", 5000),
  mkLot("l2", "h2", 25000),
  mkLot("l3", "h3", 75000),
  mkLot("l4", "h4", 9999),
  mkLot("l5", "h5", 10000),
  mkLot("l6", "h6", 50000),
  mkLot("l7", "h7", 50001),
  mkLot("l8", "h8", 0),
];

describe("filterAndSortLots — no filters", () => {
  it("empty options returns all lots in original order", () => {
    const result = filterAndSortLots(lots, horses, {});
    expect(result).toHaveLength(8);
    expect(result.map((l) => l.id)).toEqual(["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"]);
  });

  it("options with all undefined fields returns all lots", () => {
    const result = filterAndSortLots(lots, horses, {
      sex: undefined,
      ageBand: undefined,
      reserveBand: undefined,
      sort: undefined,
      q: undefined,
    });
    expect(result).toHaveLength(8);
  });

  it("empty lots array returns empty", () => {
    const result = filterAndSortLots([], horses, {});
    expect(result).toEqual([]);
  });
});

describe("filterAndSortLots — sex filter", () => {
  it("sex: colt returns only colts", () => {
    const result = filterAndSortLots(lots, horses, { sex: "colt" });
    expect(result.map((l) => l.id)).toEqual(["l1", "l5"]);
  });

  it("sex: filly returns only fillies", () => {
    const result = filterAndSortLots(lots, horses, { sex: "filly" });
    expect(result.map((l) => l.id)).toEqual(["l2", "l6"]);
  });

  it("sex: gelding returns only geldings", () => {
    const result = filterAndSortLots(lots, horses, { sex: "gelding" });
    expect(result.map((l) => l.id)).toEqual(["l3", "l7"]);
  });

  it("sex: mare returns only mares", () => {
    const result = filterAndSortLots(lots, horses, { sex: "mare" });
    expect(result.map((l) => l.id)).toEqual(["l4", "l8"]);
  });

  it("lot with horse not in horses array is filtered out by sex filter", () => {
    const orphanLot = mkLot("l9", "h-missing", 5000);
    const result = filterAndSortLots([orphanLot, ...lots], horses, { sex: "colt" });
    expect(result.map((l) => l.id)).toEqual(["l1", "l5"]);
  });
});

describe("filterAndSortLots — age band filter", () => {
  it("ageBand: weanling (age 0) returns only age-0 horses", () => {
    const result = filterAndSortLots(lots, horses, { ageBand: "weanling" });
    expect(result.map((l) => l.id)).toEqual(["l1", "l6"]);
  });

  it("ageBand: yearling (age 1) returns only age-1 horses", () => {
    const result = filterAndSortLots(lots, horses, { ageBand: "yearling" });
    expect(result.map((l) => l.id)).toEqual(["l2", "l7"]);
  });

  it("ageBand: 2yo (age 2) returns only age-2 horses", () => {
    const result = filterAndSortLots(lots, horses, { ageBand: "2yo" });
    expect(result.map((l) => l.id)).toEqual(["l3"]);
  });

  it("ageBand: 3yo+ (age >= 3) returns all age 3+ horses", () => {
    const result = filterAndSortLots(lots, horses, { ageBand: "3yo+" });
    expect(result.map((l) => l.id)).toEqual(["l4", "l5", "l8"]);
  });

  it("lot with no matching horse is filtered out by age band", () => {
    const orphanLot = mkLot("l9", "h-missing", 5000);
    const result = filterAndSortLots([orphanLot, ...lots], horses, { ageBand: "weanling" });
    expect(result.map((l) => l.id)).toEqual(["l1", "l6"]);
  });
});

describe("filterAndSortLots — reserve band filter", () => {
  it("reserveBand: under10k (< 10000 strict) returns lots with reserve < 10000", () => {
    const result = filterAndSortLots(lots, horses, { reserveBand: "under10k" });
    expect(result.map((l) => l.id)).toEqual(["l1", "l4", "l8"]);
  });

  it("reserveBand: under10k boundary — reserve exactly 10000 is NOT included", () => {
    const boundaryLot = mkLot("l9", "h1", 10000);
    const result = filterAndSortLots([boundaryLot], horses, { reserveBand: "under10k" });
    expect(result).toHaveLength(0);
  });

  it("reserveBand: 10k-50k (inclusive both ends) returns lots 10000–50000", () => {
    const result = filterAndSortLots(lots, horses, { reserveBand: "10k-50k" });
    expect(result.map((l) => l.id)).toEqual(["l2", "l5", "l6"]);
  });

  it("reserveBand: 10k-50k boundary — 9999 excluded, 50001 excluded", () => {
    const lowLot = mkLot("l9", "h1", 9999);
    const highLot = mkLot("l10", "h2", 50001);
    const result = filterAndSortLots([lowLot, highLot], horses, { reserveBand: "10k-50k" });
    expect(result).toHaveLength(0);
  });

  it("reserveBand: over50k (> 50000 strict) returns lots with reserve > 50000", () => {
    const result = filterAndSortLots(lots, horses, { reserveBand: "over50k" });
    expect(result.map((l) => l.id)).toEqual(["l3", "l7"]);
  });

  it("reserveBand: over50k boundary — reserve exactly 50000 is NOT included", () => {
    const boundaryLot = mkLot("l9", "h1", 50000);
    const result = filterAndSortLots([boundaryLot], horses, { reserveBand: "over50k" });
    expect(result).toHaveLength(0);
  });
});

describe("filterAndSortLots — search filter", () => {
  it("q matching horse name returns matching lots", () => {
    const result = filterAndSortLots(lots, horses, { q: "alpha" });
    expect(result.map((l) => l.id)).toEqual(["l1"]);
  });

  it("q matching sire name is case-insensitive", () => {
    const result = filterAndSortLots(lots, horses, { q: "PIONEER" });
    expect(result.map((l) => l.id)).toEqual(["l1", "l4"]);
  });

  it("q with surrounding whitespace is trimmed", () => {
    const result = filterAndSortLots(lots, horses, { q: "  alpha  " });
    expect(result.map((l) => l.id)).toEqual(["l1"]);
  });

  it("q: empty string returns all lots", () => {
    const result = filterAndSortLots(lots, horses, { q: "" });
    expect(result).toHaveLength(8);
  });

  it("q: whitespace-only string returns all lots", () => {
    const result = filterAndSortLots(lots, horses, { q: "   " });
    expect(result).toHaveLength(8);
  });

  it("q: no match returns empty", () => {
    const result = filterAndSortLots(lots, horses, { q: "xyz" });
    expect(result).toHaveLength(0);
  });

  it("lot with no matching horse is filtered out by search", () => {
    const orphanLot = mkLot("l9", "h-missing", 5000);
    const result = filterAndSortLots([orphanLot, ...lots], horses, { q: "alpha" });
    expect(result.map((l) => l.id)).toEqual(["l1"]);
  });
});

describe("filterAndSortLots — sort", () => {
  it("sort: reserve-asc orders by reservePrice ascending", () => {
    const result = filterAndSortLots(lots, horses, { sort: "reserve-asc" });
    const prices = result.map((l) => l.reservePrice);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it("sort: reserve-desc orders by reservePrice descending", () => {
    const result = filterAndSortLots(lots, horses, { sort: "reserve-desc" });
    const prices = result.map((l) => l.reservePrice);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  it("sort: lot preserves original input order", () => {
    const result = filterAndSortLots(lots, horses, { sort: "lot" });
    expect(result.map((l) => l.id)).toEqual(["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"]);
  });

  it("sort: undefined preserves original input order", () => {
    const result = filterAndSortLots(lots, horses, { sort: undefined });
    expect(result.map((l) => l.id)).toEqual(["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"]);
  });
});

describe("filterAndSortLots — combinations", () => {
  it("sex: colt + ageBand: weanling returns only L1", () => {
    const result = filterAndSortLots(lots, horses, { sex: "colt", ageBand: "weanling" });
    expect(result.map((l) => l.id)).toEqual(["l1"]);
  });

  it("sex: filly + reserveBand: 10k-50k returns L2 and L6", () => {
    const result = filterAndSortLots(lots, horses, { sex: "filly", reserveBand: "10k-50k" });
    expect(result.map((l) => l.id)).toEqual(["l2", "l6"]);
  });

  it("sex: mare + ageBand: 3yo+ + sort: reserve-asc returns L8 then L4", () => {
    const result = filterAndSortLots(lots, horses, {
      sex: "mare",
      ageBand: "3yo+",
      sort: "reserve-asc",
    });
    expect(result.map((l) => l.id)).toEqual(["l8", "l4"]);
  });
});

describe("filterAndSortLots — immutability", () => {
  it("sort does not mutate original lots array", () => {
    const originalOrder = lots.map((l) => l.id);
    filterAndSortLots(lots, horses, { sort: "reserve-asc" });
    expect(lots.map((l) => l.id)).toEqual(originalOrder);
  });

  it("filter does not mutate original lots array", () => {
    const originalOrder = lots.map((l) => l.id);
    filterAndSortLots(lots, horses, { sex: "colt" });
    expect(lots.map((l) => l.id)).toEqual(originalOrder);
  });
});

describe("filterAndSortLots — missing horse edge case", () => {
  it("lot with missing horse still included by reserveBand-only filter (no horse lookup needed)", () => {
    const orphanLot = mkLot("l9", "h-missing", 5000);
    const result = filterAndSortLots([orphanLot], horses, { reserveBand: "under10k" });
    expect(result.map((l) => l.id)).toEqual(["l9"]);
  });
});
