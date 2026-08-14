import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLiveFreshness } from "@/hooks/shared/useLiveFreshness";
import { STALE_DATA_THRESHOLD_MS } from "@/constants/raceBroadcastConstants";

describe("useLiveFreshness", () => {
  const BASE_TIME = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports 'just now' and not stale for a fresh timestamp", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    expect(result.current.timeAgo).toBe("just now");
    expect(result.current.isStale).toBe(false);
    expect(result.current.staleSeconds).toBe(0);
  });

  it("reports seconds-based relative time as the clock advances", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.timeAgo).toBe("1s ago");
    expect(result.current.staleSeconds).toBe(1);

    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.timeAgo).toBe("5s ago");
    expect(result.current.staleSeconds).toBe(5);
  });

  it("marks the timestamp stale once it exceeds the threshold", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    act(() => vi.advanceTimersByTime(STALE_DATA_THRESHOLD_MS + 1000));

    expect(result.current.isStale).toBe(true);
    expect(result.current.timeAgo).toMatch(/^[0-9]+s ago$/);
  });

  it("remains fresh right up to the threshold boundary", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    act(() => vi.advanceTimersByTime(STALE_DATA_THRESHOLD_MS));

    expect(result.current.isStale).toBe(false);
  });

  it("switches to minutes after 60 seconds", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.timeAgo).toBe("1m ago");
    expect(result.current.staleSeconds).toBe(60);

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.timeAgo).toBe("2m ago");
  });

  it("resets to fresh when the timestamp is updated", () => {
    const { result, rerender } = renderHook(({ timestamp }) => useLiveFreshness(timestamp), {
      initialProps: { timestamp: BASE_TIME },
    });

    act(() => vi.advanceTimersByTime(STALE_DATA_THRESHOLD_MS + 5_000));
    expect(result.current.isStale).toBe(true);

    rerender({ timestamp: BASE_TIME + STALE_DATA_THRESHOLD_MS + 5_000 });

    expect(result.current.timeAgo).toBe("just now");
    expect(result.current.isStale).toBe(false);
  });

  it("cleans up its interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() => useLiveFreshness(BASE_TIME));

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
