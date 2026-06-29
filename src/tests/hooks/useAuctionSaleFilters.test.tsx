import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const navigate = vi.fn();
let searchState: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useSearch: () => searchState,
}));

import { useAuctionSaleFilters } from "@/hooks/auction/useAuctionSaleFilters";

describe("useAuctionSaleFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigate.mockClear();
    searchState = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates sex via onUpdateFilter", () => {
    const { result } = renderHook(() => useAuctionSaleFilters());
    act(() => result.current.onUpdateFilter({ sex: "colt" }));
    expect(navigate).toHaveBeenCalledTimes(1);
    const searchFn = navigate.mock.calls[0][0].search;
    expect(searchFn({})).toEqual({ sex: "colt" });
  });

  it("updates ageBand via onUpdateFilter", () => {
    const { result } = renderHook(() => useAuctionSaleFilters());
    act(() => result.current.onUpdateFilter({ ageBand: "yearling" }));
    const searchFn = navigate.mock.calls[0][0].search;
    expect(searchFn({})).toEqual({ ageBand: "yearling" });
  });

  it("updates reserveBand via onUpdateFilter", () => {
    const { result } = renderHook(() => useAuctionSaleFilters());
    act(() => result.current.onUpdateFilter({ reserveBand: "over50k" }));
    const searchFn = navigate.mock.calls[0][0].search;
    expect(searchFn({})).toEqual({ reserveBand: "over50k" });
  });

  it("updates sort via onUpdateFilter", () => {
    const { result } = renderHook(() => useAuctionSaleFilters());
    act(() => result.current.onUpdateFilter({ sort: "reserve-asc" }));
    const searchFn = navigate.mock.calls[0][0].search;
    expect(searchFn({})).toEqual({ sort: "reserve-asc" });
  });

  it("supports function-form updates", () => {
    const { result } = renderHook(() => useAuctionSaleFilters());
    act(() =>
      result.current.onUpdateFilter((prev) => ({ ...prev, sex: "filly" })),
    );
    const searchFn = navigate.mock.calls[0][0].search;
    expect(searchFn({ ageBand: "2yo" })).toEqual({ ageBand: "2yo", sex: "filly" });
  });

  it("preserves existing params when updating a single filter", () => {
    searchState = { sex: "colt", q: "foo" };
    const { result } = renderHook(() => useAuctionSaleFilters());
    act(() => result.current.onUpdateFilter({ ageBand: "yearling" }));
    const searchFn = navigate.mock.calls[0][0].search;
    expect(searchFn({ sex: "colt", q: "foo" })).toEqual({
      sex: "colt",
      q: "foo",
      ageBand: "yearling",
    });
  });

  it("clears all params via onResetFilters", () => {
    searchState = { sex: "colt", ageBand: "yearling", sort: "reserve-asc" };
    const { result } = renderHook(() => useAuctionSaleFilters());
    act(() => result.current.onResetFilters());
    expect(navigate).toHaveBeenCalledTimes(1);
    const searchFn = navigate.mock.calls[0][0].search;
    expect(searchFn({ sex: "colt", ageBand: "yearling" })).toEqual({});
  });

  it("reports hasActiveFilters correctly", () => {
    searchState = {};
    const { result: empty } = renderHook(() => useAuctionSaleFilters());
    expect(empty.current.hasActiveFilters).toBe(false);

    searchState = { sex: "colt" };
    const { result: withSex } = renderHook(() => useAuctionSaleFilters());
    expect(withSex.current.hasActiveFilters).toBe(true);

    searchState = { sort: "reserve-asc" };
    const { result: withSortOnly } = renderHook(() => useAuctionSaleFilters());
    expect(withSortOnly.current.hasActiveFilters).toBe(false);
  });
});
