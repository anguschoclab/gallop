/**
 * Characterization tests for useAuctionTheater.
 *
 * Pins the hook's full return-map contract and the skip/commit lifecycle ahead
 * of the runner-lifecycle + UI-state extraction refactor.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/platform/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector(mockState),
  useGameWithShallow: (selector: (s: any) => any) => selector(mockState),
}));

import { useAuctionTheater } from "@/domains/auction/application/hooks/useAuctionTheater";
import { createDefaultGameState } from "@/platform/game/store/state";
import { h2r } from "@/tests/helpers/sampleGameState";

let mockState: any;
const commitAuctionResult = vi.fn((_saleId: string, _lots?: any, _impacts?: any) => ({ ok: true }));
const debitForLiveBid = vi.fn(() => ({ ok: true }));

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

const EXPECTED_KEYS = [
  "activePaddle",
  "autoWatch",
  "bannerFlash",
  "bidError",
  "bidHistory",
  "bidHistoryError",
  "canRetryBid",
  "chantLines",
  "committed",
  "currentBid",
  "currentHorse",
  "currentLot",
  "dismissBidError",
  "dismissedErrors",
  "done",
  "handleBid",
  "handleCommit",
  "handlePass",
  "handleSkip",
  "hammerFlash",
  "historyOpen",
  "leadingBidder",
  "lotIndex",
  "lotState",
  "paused",
  "playerIsLeading",
  "playerMaxBidState",
  "retryBid",
  "retryBidHistory",
  "sale",
  "setAutoWatch",
  "setHistoryOpen",
  "setPaused",
  "setPlayerMaxBidState",
  "totalLots",
  "winOverlay",
].sort();

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  commitAuctionResult.mockClear();
  debitForLiveBid.mockClear();
  seedState({
    auctions: [mkSale([mkLot()])],
    horses: h2r([mkHorse()] as any),
    npcStables: [],
    scoutReports: [],
    day: 10,
    debitForLiveBid,
    commitAuctionResult,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAuctionTheater", () => {
  it("exposes the full theater contract", () => {
    const { result } = renderHook(() => useAuctionTheater("sale1"));
    expect(Object.keys(result.current).sort()).toEqual(EXPECTED_KEYS);
  });

  it("starts in live state for an unresolved sale", () => {
    const { result } = renderHook(() => useAuctionTheater("sale1"));
    expect(result.current.sale?.id).toBe("sale1");
    expect(result.current.done).toBe(false);
    expect(result.current.paused).toBe(false);
    expect(result.current.committed).toBe(false);
    expect(result.current.autoWatch).toBe(true);
    expect(result.current.currentLot?.id).toBe("lot1");
    expect(result.current.currentHorse?.name).toBe("Test Horse");
    expect(result.current.totalLots).toBe(1);
    expect(result.current.lotIndex).toBe(0);
  });

  it("returns undefined sale for an unknown saleId", () => {
    const { result } = renderHook(() => useAuctionTheater("nope"));
    expect(result.current.sale).toBeUndefined();
    expect(result.current.done).toBe(false);
  });

  it("setPaused toggles the paused flag", () => {
    const { result } = renderHook(() => useAuctionTheater("sale1"));
    act(() => result.current.setPaused(true));
    expect(result.current.paused).toBe(true);
    act(() => result.current.setPaused(false));
    expect(result.current.paused).toBe(false);
  });

  it("handleSkip marks the sale done", () => {
    const { result } = renderHook(() => useAuctionTheater("sale1"));
    act(() => result.current.handleSkip());
    expect(result.current.done).toBe(true);
  });

  it("handleCommit calls commitAuctionResult once and sets committed", () => {
    const { result } = renderHook(() => useAuctionTheater("sale1"));
    act(() => result.current.handleCommit());
    expect(commitAuctionResult).toHaveBeenCalledTimes(1);
    expect(commitAuctionResult.mock.calls[0][0]).toBe("sale1");
    expect(result.current.committed).toBe(true);

    act(() => result.current.handleCommit());
    expect(commitAuctionResult).toHaveBeenCalledTimes(1);
  });

  it("setHistoryOpen and setAutoWatch update ui state", () => {
    const { result } = renderHook(() => useAuctionTheater("sale1"));
    act(() => result.current.setHistoryOpen(true));
    expect(result.current.historyOpen).toBe(true);
    act(() => result.current.setAutoWatch(false));
    expect(result.current.autoWatch).toBe(false);
  });
});
