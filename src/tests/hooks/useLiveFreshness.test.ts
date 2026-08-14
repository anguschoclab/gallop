import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLiveFreshness } from "@/hooks/shared/useLiveFreshness";
import {
  STALE_DATA_THRESHOLD_MS,
  FRESHNESS_WARNING_THRESHOLD_MS,
} from "@/constants/raceBroadcastConstants";

describe("useLiveFreshness", () => {
  const BASE_TIME = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports 'just now' / '0s ago', level 'fresh' and not stale for a fresh timestamp", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    expect(result.current.timeAgo).toBe("just now");
    expect(result.current.exactSecondsAgo).toBe("0s ago");
    expect(result.current.isStale).toBe(false);
    expect(result.current.staleSeconds).toBe(0);
    expect(result.current.level).toBe("fresh");
  });

  it("reports seconds-based relative time as the clock advances", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.timeAgo).toBe("1s ago");
    expect(result.current.exactSecondsAgo).toBe("1s ago");
    expect(result.current.staleSeconds).toBe(1);

    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.timeAgo).toBe("5s ago");
    expect(result.current.exactSecondsAgo).toBe("5s ago");
    expect(result.current.staleSeconds).toBe(5);
  });

  it("marks the timestamp stale once it exceeds the threshold", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    act(() => vi.advanceTimersByTime(STALE_DATA_THRESHOLD_MS + 1000));

    expect(result.current.isStale).toBe(true);
    expect(result.current.level).toBe("stale");
    expect(result.current.timeAgo).toMatch(/^[0-9]+s ago$/);
  });

  describe("boundary transitions at exactly 3s and 5s", () => {
    it("is 'fresh' at 3000ms (inclusive) and transitions to 'warning' at 3001ms (exclusive)", () => {
      // Test direct timestamp calculation at exact millisecond boundaries
      const { result: res3000 } = renderHook(() => useLiveFreshness(BASE_TIME - 3000));
      expect(res3000.current.level).toBe("fresh");
      expect(res3000.current.isStale).toBe(false);
      expect(res3000.current.staleSeconds).toBe(3);
      expect(res3000.current.exactSecondsAgo).toBe("3s ago");

      const { result: res3001 } = renderHook(() => useLiveFreshness(BASE_TIME - 3001));
      expect(res3001.current.level).toBe("warning");
      expect(res3001.current.isStale).toBe(false);
      expect(res3001.current.staleSeconds).toBe(3);
      expect(res3001.current.exactSecondsAgo).toBe("3s ago");
    });

    it("is 'warning' at 5000ms (inclusive) and transitions to 'stale' at 5001ms (exclusive)", () => {
      const { result: res5000 } = renderHook(() => useLiveFreshness(BASE_TIME - 5000));
      expect(res5000.current.level).toBe("warning");
      expect(res5000.current.isStale).toBe(false);
      expect(res5000.current.staleSeconds).toBe(5);
      expect(res5000.current.exactSecondsAgo).toBe("5s ago");

      const { result: res5001 } = renderHook(() => useLiveFreshness(BASE_TIME - 5001));
      expect(res5001.current.level).toBe("stale");
      expect(res5001.current.isStale).toBe(true);
      expect(res5001.current.staleSeconds).toBe(5);
      expect(res5001.current.exactSecondsAgo).toBe("5s ago");
    });

    it("tracks level transitions through timer ticks (0s -> 3s fresh, 4s -> 5s warning, 6s+ stale)", () => {
      const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

      // 0s
      expect(result.current.level).toBe("fresh");
      expect(result.current.exactSecondsAgo).toBe("0s ago");

      // Advance to 3s (3000ms) - still fresh (inclusive)
      act(() => vi.advanceTimersByTime(3000));
      expect(result.current.level).toBe("fresh");
      expect(result.current.isStale).toBe(false);
      expect(result.current.staleSeconds).toBe(3);
      expect(result.current.exactSecondsAgo).toBe("3s ago");

      // Advance to 4s (4000ms) - transitions to warning
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.level).toBe("warning");
      expect(result.current.isStale).toBe(false);
      expect(result.current.staleSeconds).toBe(4);
      expect(result.current.exactSecondsAgo).toBe("4s ago");

      // Advance to 5s (5000ms) - still warning (inclusive)
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.level).toBe("warning");
      expect(result.current.isStale).toBe(false);
      expect(result.current.staleSeconds).toBe(5);
      expect(result.current.exactSecondsAgo).toBe("5s ago");

      // Advance to 6s (6000ms) - transitions to stale
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.level).toBe("stale");
      expect(result.current.isStale).toBe(true);
      expect(result.current.staleSeconds).toBe(6);
      expect(result.current.exactSecondsAgo).toBe("6s ago");
    });
  });

  it("switches to minutes after 60 seconds", () => {
    const { result } = renderHook(() => useLiveFreshness(BASE_TIME));

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.timeAgo).toBe("1m ago");
    expect(result.current.exactSecondsAgo).toBe("60s ago");
    expect(result.current.staleSeconds).toBe(60);
    expect(result.current.level).toBe("stale");

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.timeAgo).toBe("2m ago");
    expect(result.current.exactSecondsAgo).toBe("120s ago");
  });

  it("resets to fresh when the timestamp is updated", () => {
    const { result, rerender } = renderHook(({ timestamp }) => useLiveFreshness(timestamp), {
      initialProps: { timestamp: BASE_TIME },
    });

    act(() => vi.advanceTimersByTime(STALE_DATA_THRESHOLD_MS + 5_000));
    expect(result.current.isStale).toBe(true);
    expect(result.current.level).toBe("stale");

    rerender({ timestamp: BASE_TIME + STALE_DATA_THRESHOLD_MS + 5_000 });

    expect(result.current.timeAgo).toBe("just now");
    expect(result.current.exactSecondsAgo).toBe("0s ago");
    expect(result.current.isStale).toBe(false);
    expect(result.current.level).toBe("fresh");
  });

  it("cleans up its interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() => useLiveFreshness(BASE_TIME));

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
