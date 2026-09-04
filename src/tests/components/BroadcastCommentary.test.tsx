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
  receivedAt?: number,
): CommentaryLine {
  return {
    id,
    text,
    timestamp,
    type: "INFO",
    horseId: null,
    isHighImpact,
    receivedAt,
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

    const badge = screen.getByLabelText("Commentary last updated 0s ago");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Live");
    expect(badge).toHaveTextContent("0s ago");
  });

  it("renders live badge with fallback when lastUpdatedAt is omitted", () => {
    render(<BroadcastCommentary commentary={[]} />);

    const badge = screen.getByLabelText("Commentary last updated 0s ago");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Live");
    expect(badge).toHaveTextContent("0s ago");
  });

  it("keeps '0s ago' for durations under 1 second", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const badge = screen.getByLabelText("Commentary last updated 0s ago");
    expect(badge).toHaveTextContent("0s ago");

    act(() => {
      vi.advanceTimersByTime(400); // 900ms total
    });

    expect(screen.getByLabelText("Commentary last updated 0s ago")).toHaveTextContent("0s ago");
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

  it("updates badge freshness with exact seconds after 60 seconds ('60s ago', '120s ago', '300s ago')", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    // 60 seconds elapsed (60s)
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByLabelText("Commentary last updated 60s ago")).toHaveTextContent("60s ago");

    // 119 seconds elapsed (119s)
    act(() => {
      vi.advanceTimersByTime(59000);
    });
    expect(screen.getByLabelText("Commentary last updated 119s ago")).toHaveTextContent("119s ago");

    // 120 seconds elapsed (120s)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText("Commentary last updated 120s ago")).toHaveTextContent("120s ago");

    // 5 minutes elapsed (300s)
    act(() => {
      vi.advanceTimersByTime(180000);
    });
    expect(screen.getByLabelText("Commentary last updated 300s ago")).toHaveTextContent("300s ago");
  });

  it("resets badge freshness back to '0s ago' when lastUpdatedAt prop is updated", () => {
    const { rerender } = render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    // Advance 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByLabelText("Commentary last updated 10s ago")).toHaveTextContent("10s ago");

    // New commentary arrival at BASE_TIME + 10000
    const newTimestamp = BASE_TIME + 10000;
    rerender(<BroadcastCommentary commentary={[]} lastUpdatedAt={newTimestamp} />);

    // Immediately resets to "0s ago"
    expect(screen.getByLabelText("Commentary last updated 0s ago")).toHaveTextContent("0s ago");

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

  it("renders empty state when commentary is empty", () => {
    render(<BroadcastCommentary commentary={[]} lastUpdatedAt={BASE_TIME} />);

    expect(screen.getByText("Commentary")).toBeInTheDocument();
    expect(screen.getByText("No commentary yet")).toBeInTheDocument();
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

  it("displays formatted PBP tick received timestamp on each commentary line when receivedAt is present", () => {
    const receivedTime = new Date("2026-08-14T15:30:45Z").getTime();
    const lines = [
      makeCommentaryLine("c1", "First tick event", 2.0, false, receivedTime),
      makeCommentaryLine("c2", "Second tick event", 4.5, true, receivedTime + 2000),
    ];

    render(<BroadcastCommentary commentary={lines} lastUpdatedAt={BASE_TIME} />);

    const tickTimestamps = screen.getAllByTestId("pbp-received-time");
    expect(tickTimestamps).toHaveLength(2);

    const expectedTime1 = new Date(receivedTime).toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const expectedTime2 = new Date(receivedTime + 2000).toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    expect(tickTimestamps[0]).toHaveTextContent(expectedTime1);
    expect(tickTimestamps[0]).toHaveAttribute(
      "aria-label",
      `PBP tick received at ${expectedTime1}`,
    );
    expect(tickTimestamps[1]).toHaveTextContent(expectedTime2);
    expect(tickTimestamps[1]).toHaveAttribute(
      "aria-label",
      `PBP tick received at ${expectedTime2}`,
    );
  });

  it("omits the PBP receive timestamp element gracefully when receivedAt is undefined", () => {
    const lines = [makeCommentaryLine("c1", "No receivedAt line", 1.0, false, undefined)];

    render(<BroadcastCommentary commentary={lines} lastUpdatedAt={BASE_TIME} />);

    expect(screen.getByText("1.0s")).toBeInTheDocument();
    expect(screen.queryByTestId("pbp-received-time")).not.toBeInTheDocument();
  });
});
