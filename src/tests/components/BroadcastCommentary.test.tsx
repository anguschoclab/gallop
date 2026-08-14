/**
 * BroadcastCommentary.test.tsx
 *
 * Automated tests for the BroadcastCommentary component verifying:
 * - Live badge rendering and accessible labels
 * - Badge relative timing behavior using mocked timers (just now, Xs ago, Xm ago)
 * - Badge reset on lastUpdatedAt prop changes
 * - Fallback behavior when lastUpdatedAt is undefined
 * - Commentary lines display, high-impact indicators, and empty state
 * - Timer interval cleanup on unmount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BroadcastCommentary } from "@/components/race/BroadcastCommentary";
import { STALE_DATA_THRESHOLD_MS } from "@/constants/raceBroadcastConstants";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";

function makeCommentaryLine(
  id: string,
  text: string,
  timestamp: number = 0,
  isHighImpact: boolean = false,
): CommentaryLine {
  return {
    id,
    text,
    timestamp,
    type: "INFO",
    horseId: null,
    isHighImpact,
  } as unknown as CommentaryLine;
}

describe("BroadcastCommentary - Badge Timing Behavior", () => {
  const BASE_TIME = 1700000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders live badge with 'just now' on initial mount when lastUpdatedAt is provided", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    const badge = screen.getByLabelText("Commentary last updated just now");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Live");
    expect(badge).toHaveTextContent("just now");
  });

  it("renders live badge with fallback when lastUpdatedAt is omitted", () => {
    render(<BroadcastCommentary commentary={[]} />);

    const badge = screen.getByLabelText("Commentary last updated just now");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Live");
    expect(badge).toHaveTextContent("just now");
  });

  it("keeps 'just now' for durations under 1 second", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const badge = screen.getByLabelText("Commentary last updated just now");
    expect(badge).toHaveTextContent("just now");

    act(() => {
      vi.advanceTimersByTime(400); // 900ms total
    });

    expect(screen.getByLabelText("Commentary last updated just now")).toHaveTextContent("just now");
  });

  it("updates badge freshness to seconds ('1s ago', '5s ago', '45s ago') as time progresses", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    // 1 second elapsed
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText("Commentary last updated 1s ago")).toHaveTextContent("1s ago");

    // 5 seconds elapsed
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByLabelText("Commentary last updated 5s ago")).toHaveTextContent("5s ago");

    // 45 seconds elapsed
    act(() => {
      vi.advanceTimersByTime(40000);
    });
    expect(screen.getByLabelText("Commentary last updated 45s ago")).toHaveTextContent("45s ago");

    // 59 seconds elapsed
    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(screen.getByLabelText("Commentary last updated 59s ago")).toHaveTextContent("59s ago");
  });

  it("updates badge freshness to minutes ('1m ago', '2m ago') after 60 seconds", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    // 60 seconds elapsed (1m)
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByLabelText("Commentary last updated 1m ago")).toHaveTextContent("1m ago");

    // 119 seconds elapsed (still 1m)
    act(() => {
      vi.advanceTimersByTime(59000);
    });
    expect(screen.getByLabelText("Commentary last updated 1m ago")).toHaveTextContent("1m ago");

    // 120 seconds elapsed (2m)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText("Commentary last updated 2m ago")).toHaveTextContent("2m ago");

    // 5 minutes elapsed
    act(() => {
      vi.advanceTimersByTime(180000);
    });
    expect(screen.getByLabelText("Commentary last updated 5m ago")).toHaveTextContent("5m ago");
  });

  it("resets badge freshness back to 'just now' when lastUpdatedAt prop is updated", () => {
    const { rerender } = render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    // Advance 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByLabelText("Commentary last updated 10s ago")).toHaveTextContent("10s ago");

    // New commentary arrival at BASE_TIME + 10000
    const newTimestamp = BASE_TIME + 10000;
    rerender(<BroadcastCommentary commentary={[]} lastUpdatedAt={newTimestamp} />);

    // Immediately resets to "just now"
    expect(screen.getByLabelText("Commentary last updated just now")).toHaveTextContent("just now");

    // Advance 3 more seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByLabelText("Commentary last updated 3s ago")).toHaveTextContent("3s ago");
  });

  it("shows a stale data warning when the last update exceeds the threshold", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    act(() => {
      vi.advanceTimersByTime(STALE_DATA_THRESHOLD_MS + 1000);
    });

    const badge = screen.getByLabelText("Commentary last updated 6s ago");
    expect(badge).toHaveTextContent("Stale data");
    expect(badge).toHaveTextContent("6s ago");
  });

  it("cleans up the timer interval on component unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});

describe("BroadcastCommentary - Content and Visual Elements", () => {
  const BASE_TIME = 1700000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'System Initializing' state when commentary is empty", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    expect(screen.getByText("Live Commentary")).toBeInTheDocument();
    expect(screen.getByText("Race Broadcast Service")).toBeInTheDocument();
    expect(screen.getByText("System Initializing")).toBeInTheDocument();
  });

  it("renders commentary lines up to the visible limit (last 8 lines)", () => {
    const lines = Array.from({ length: 10 }, (_, i) =>
      makeCommentaryLine(`c${i}`, `Commentary line ${i}`, i * 2),
    );

    render(<BroadcastCommentary commentary={lines} lastUpdatedAt={BASE_TIME} />);

    // Should only render last 8 lines (c2 through c9)
    expect(screen.queryByText("Commentary line 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Commentary line 1")).not.toBeInTheDocument();
    expect(screen.getByText("Commentary line 2")).toBeInTheDocument();
    expect(screen.getByText("Commentary line 9")).toBeInTheDocument();

    // Timestamps formatted with 1 decimal place
    expect(screen.getByText("4.0s")).toBeInTheDocument();
    expect(screen.getByText("18.0s")).toBeInTheDocument();
  });

  it("displays high-impact ping indicator only on the latest line", () => {
    const lines = [
      makeCommentaryLine("c1", "Normal lead change", 1.5, false),
      makeCommentaryLine("c2", "Earlier high impact move", 3.0, true),
      makeCommentaryLine("c3", "Dramatic photo finish move!", 5.0, true),
    ];

    const { container } = render(
      <BroadcastCommentary commentary={lines} lastUpdatedAt={BASE_TIME} />,
    );

    // Only the latest line (c3) should have the ping element
    const pings = container.querySelectorAll(".animate-ping");
    expect(pings).toHaveLength(1);
    expect(pings[0].closest(".text-foreground") || pings[0].parentElement).toHaveTextContent(
      "Dramatic photo finish move!",
    );
  });
});
