import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabShimmer } from "@/hooks/leaderboard/useTabShimmer";

describe("useTabShimmer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not shimmering on initial render", () => {
    const { result } = renderHook(() => useTabShimmer("tab1"));
    expect(result.current).toBe(false);
  });

  it("triggers shimmer on tab change", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ tab }) => useTabShimmer(tab), {
      initialProps: { tab: "tab1" },
    });
    expect(result.current).toBe(false);
    act(() => {
      rerender({ tab: "tab2" });
    });
    expect(result.current).toBe(true);
  });

  it("clears shimmer after default duration (350ms)", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ tab }) => useTabShimmer(tab), {
      initialProps: { tab: "tab1" },
    });
    act(() => {
      rerender({ tab: "tab2" });
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current).toBe(false);
  });

  it("supports custom duration", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ tab }) => useTabShimmer(tab, 500), {
      initialProps: { tab: "tab1" },
    });
    act(() => {
      rerender({ tab: "tab2" });
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it("resets timer on rapid tab changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ tab }) => useTabShimmer(tab), {
      initialProps: { tab: "tab1" },
    });
    act(() => {
      rerender({ tab: "tab2" });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);
    act(() => {
      rerender({ tab: "tab3" });
    });
    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it("cleans up timeout on unmount", () => {
    vi.useFakeTimers();
    const { result, rerender, unmount } = renderHook(({ tab }) => useTabShimmer(tab), {
      initialProps: { tab: "tab1" },
    });
    act(() => {
      rerender({ tab: "tab2" });
    });
    expect(result.current).toBe(true);
    unmount();
    act(() => {
      vi.advanceTimersByTime(350);
    });
  });
});
