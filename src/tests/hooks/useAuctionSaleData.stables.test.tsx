import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector(mockState),
  useGameWithShallow: (selector: (s: any) => any) => selector(mockState),
}));

vi.mock("@/core/npc/scouting", () => ({
  getDisplayableStats: () => ({ stats: null, overallEstimate: null }),
}));

vi.mock("@/services/auction/auctionLotFilter", () => ({
  filterAndSortLots: (lots: any[]) => lots,
}));

import { useAuctionSaleData } from "@/hooks/auction/useAuctionSaleData";
import { createDefaultGameState } from "@/game/store/state";
import { createTestStable } from "@/tests/helpers";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

let mockState: any;

const mkLot = (overrides: Partial<any> = {}) => ({
  id: "lot1",
  horseId: "h1",
  consignorStableId: "s1",
  saleId: "sale1",
  reservePrice: 1000,
  passed: false,
  withdrawn: false,
  ...overrides,
});

const mkSale = (lots: any[], overrides: Partial<any> = {}) => ({
  id: "sale1",
  name: "Test Sale",
  day: 10,
  kind: "yearling",
  lots,
  resolved: false,
  ...overrides,
});

const mkHorse = (overrides: Partial<any> = {}) => ({
  id: "h1",
  name: "Test Horse",
  age: 1,
  gender: "colt",
  ...overrides,
});

beforeEach(() => {
  sessionStorage.clear();
  const stables = [
    createTestStable({ id: "s1", name: "Godolphin" }),
    createTestStable({ id: "s2", name: "Coolmore" }),
  ];
  mockState = {
    ...createDefaultGameState(),
    auctions: [mkSale([mkLot()])],
    horses: h2r([mkHorse()]),
    horseMap: new Map([["h1", mkHorse()]]),
    cash: 100000,
    day: 10,
    npcStables: stables,
    scoutReports: [],
    placeBookBid: vi.fn(() => ({ ok: true })),
    withdrawConsignment: vi.fn(() => ({ ok: true })),
    buyNow: vi.fn(() => ({ ok: true })),
  } as any;
});

describe("useAuctionSaleData — stables export", () => {
  it("returns stables from store", () => {
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    expect(result.current.stables).toBeDefined();
    expect(result.current.stables).toHaveLength(2);
  });

  it("stables matches npcStables from game state", () => {
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    expect(result.current.stables[0].id).toBe("s1");
    expect(result.current.stables[0].name).toBe("Godolphin");
    expect(result.current.stables[1].id).toBe("s2");
    expect(result.current.stables[1].name).toBe("Coolmore");
  });
});
