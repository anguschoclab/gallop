import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

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

let mockState: any;

function seedState(overrides: Record<string, unknown> = {}) {
  mockState = { ...createDefaultGameState(), ...overrides } as any;
}

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
  seedState({
    auctions: [mkSale([mkLot()])],
    horses: [mkHorse()],
    horseMap: new Map([["h1", mkHorse()]]),
    cash: 100000,
    day: 10,
    npcStables: [],
    scoutReports: [],
    placeBookBid: vi.fn(() => ({ ok: true })),
    withdrawConsignment: vi.fn(() => ({ ok: true })),
    buyNow: vi.fn(() => ({ ok: true })),
  });
});

describe("useAuctionSaleData", () => {
  it("error is null initially", () => {
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    expect(result.current.error).toBe(null);
  });

  it("handleBid with amount <= currentPrice sets error", () => {
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.handleBid(0));
    expect(result.current.error).toBe("Bid must exceed current price.");
  });

  it("handleBid with amount > cash sets error", () => {
    seedState({
      auctions: [mkSale([mkLot()])],
      horses: [mkHorse()],
      horseMap: new Map([["h1", mkHorse()]]),
      cash: 500,
      day: 10,
      npcStables: [],
      scoutReports: [],
      placeBookBid: vi.fn(() => ({ ok: true })),
      withdrawConsignment: vi.fn(() => ({ ok: true })),
      buyNow: vi.fn(() => ({ ok: true })),
    });
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.handleBid(1000));
    expect(result.current.error).toBe("Insufficient funds.");
  });

  it("handleBid with valid amount clears error and sets message", () => {
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.handleBid(5000));
    expect(result.current.error).toBe(null);
    expect(result.current.message).toBe("Bid placed.");
  });

  it("dismissError clears error to null", () => {
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.handleBid(0));
    expect(result.current.error).not.toBe(null);
    act(() => result.current.dismissError());
    expect(result.current.error).toBe(null);
  });

  it("canRetry is false initially, true after a bid attempt", () => {
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    expect(result.current.canRetry).toBe(false);
    act(() => result.current.handleBid(5000));
    expect(result.current.canRetry).toBe(true);
  });

  it("retryLastBid re-attempts the last bid", () => {
    const placeBookBid = vi.fn(() => ({ ok: true }));
    seedState({
      auctions: [mkSale([mkLot()])],
      horses: [mkHorse()],
      horseMap: new Map([["h1", mkHorse()]]),
      cash: 100000,
      day: 10,
      npcStables: [],
      scoutReports: [],
      placeBookBid,
      withdrawConsignment: vi.fn(() => ({ ok: true })),
      buyNow: vi.fn(() => ({ ok: true })),
    });
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.handleBid(5000));
    placeBookBid.mockClear();
    act(() => result.current.retryLastBid());
    expect(placeBookBid).toHaveBeenCalledWith("sale1", "lot1", 5000);
  });

  it("refetchSaleData clears error state", () => {
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.handleBid(0));
    expect(result.current.error).not.toBe(null);
    act(() => result.current.refetchSaleData());
    expect(result.current.error).toBe(null);
  });

  it("refetchSaleData clears dismissed errors from sessionStorage for that saleId", () => {
    sessionStorage.setItem("gallop:auction:dismissed:sale1:sale_not_found", "1");
    sessionStorage.setItem("gallop:auction:dismissed:sale1:bid_error", "1");
    sessionStorage.setItem("gallop:auction:dismissed:sale2:sale_not_found", "1");
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.refetchSaleData());
    expect(sessionStorage.getItem("gallop:auction:dismissed:sale1:sale_not_found")).toBe(null);
    expect(sessionStorage.getItem("gallop:auction:dismissed:sale1:bid_error")).toBe(null);
    expect(sessionStorage.getItem("gallop:auction:dismissed:sale2:sale_not_found")).toBe("1");
  });

  it("handleBuyNow sets error on failure", () => {
    seedState({
      auctions: [mkSale([mkLot()])],
      horses: [mkHorse()],
      horseMap: new Map([["h1", mkHorse()]]),
      cash: 100000,
      day: 10,
      npcStables: [],
      scoutReports: [],
      placeBookBid: vi.fn(() => ({ ok: true })),
      withdrawConsignment: vi.fn(() => ({ ok: true })),
      buyNow: vi.fn(() => ({ ok: false, reason: "lot_not_available" })),
    });
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.handleBuyNow());
    expect(result.current.error).toBe("lot_not_available");
  });

  it("handleWithdraw sets error on failure", () => {
    seedState({
      auctions: [mkSale([mkLot()])],
      horses: [mkHorse()],
      horseMap: new Map([["h1", mkHorse()]]),
      cash: 100000,
      day: 10,
      npcStables: [],
      scoutReports: [],
      placeBookBid: vi.fn(() => ({ ok: true })),
      withdrawConsignment: vi.fn(() => ({ ok: false, reason: "Horse not consigned." })),
      buyNow: vi.fn(() => ({ ok: true })),
    });
    const { result } = renderHook(() => useAuctionSaleData("sale1", {}));
    act(() => result.current.handleWithdraw());
    expect(result.current.error).toBe("Horse not consigned.");
  });
});
